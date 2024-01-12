/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  errorHandler,
  PluginDatabaseManager,
  TokenManager,
} from '@backstage/backend-common';
import express, { Request } from 'express';
import Router from 'express-promise-router';
import {
  getBearerTokenFromAuthorizationHeader,
  IdentityApi,
} from '@backstage/plugin-auth-node';
import {
  DatabaseNotificationsStore,
  NotificationGetOptions,
} from '../database';
import { v4 as uuid } from 'uuid';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import {
  Entity,
  isGroupEntity,
  isUserEntity,
  RELATION_HAS_MEMBER,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { NotificationProcessor } from '../types';
import { AuthenticationError } from '@backstage/errors';
import { DiscoveryApi } from '@backstage/core-plugin-api';
import { LoggerService } from '@backstage/backend-plugin-api';

/** @public */
export interface RouterOptions {
  logger: LoggerService;
  identity: IdentityApi;
  database: PluginDatabaseManager;
  tokenManager: TokenManager;
  discovery: DiscoveryApi;
  catalog?: CatalogApi;
  processors?: NotificationProcessor[];
}

/** @public */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const {
    logger,
    database,
    identity,
    discovery,
    catalog,
    tokenManager,
    processors,
  } = options;

  const catalogClient =
    catalog ?? new CatalogClient({ discoveryApi: discovery });
  const store = await DatabaseNotificationsStore.create({ database });

  const getUser = async (req: Request<unknown>) => {
    const user = await identity.getIdentity({ request: req });
    return user ? user.identity.userEntityRef : 'user:default/guest';
  };

  const authenticateService = async (req: Request<unknown>) => {
    const token = getBearerTokenFromAuthorizationHeader(
      req.header('authorization'),
    );
    if (!token) {
      throw new AuthenticationError();
    }
    await tokenManager.authenticate(token);
  };

  const getUsersForEntityRef = async (
    entityRef: string | string[],
  ): Promise<string[]> => {
    const refs = Array.isArray(entityRef) ? entityRef : [entityRef];
    const { token } = await tokenManager.getToken();
    const entities = await catalogClient.getEntitiesByRefs(
      {
        entityRefs: refs,
      },
      { token },
    );
    const mapEntity = async (entity: Entity | undefined): Promise<string[]> => {
      if (!entity) {
        return [];
      }

      if (isUserEntity(entity)) {
        return [stringifyEntityRef(entity)];
      } else if (isGroupEntity(entity) && entity.relations) {
        return entity.relations
          .filter(
            relation =>
              relation.type === RELATION_HAS_MEMBER && relation.targetRef,
          )
          .map(r => r.targetRef);
      } else if (!isGroupEntity(entity) && entity.spec?.owner) {
        const owner = await catalogClient.getEntityByRef(
          entity.spec.owner as string,
          { token },
        );
        if (owner) {
          return mapEntity(owner);
        }
      }

      return [];
    };

    const users: string[] = [];
    for (const entity of entities.items) {
      const u = await mapEntity(entity);
      users.push(...u);
    }
    return users;
  };

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/notifications', async (req, res) => {
    const user = await getUser(req);
    const opts: NotificationGetOptions = {
      user_ref: user,
    };
    if (req.query.type) {
      opts.type = req.query.type as any;
    }

    const notifications = await store.getNotifications(opts);
    res.send(notifications);
  });

  router.get('/status', async (req, res) => {
    const user = await getUser(req);
    const status = await store.getStatus({ user_ref: user });
    res.send(status);
  });

  router.post('/read', async (req, res) => {
    const user = await getUser(req);
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).send();
      return;
    }
    await store.markRead({ user_ref: user, ids });
    res.status(200).send({ ids });
  });

  router.post('/unread', async (req, res) => {
    const user = await getUser(req);
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).send();
      return;
    }
    await store.markUnread({ user_ref: user, ids });
    res.status(200).send({ ids });
  });

  router.post('/save', async (req, res) => {
    const user = await getUser(req);
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).send();
      return;
    }
    await store.markSaved({ user_ref: user, ids });
    res.status(200).send({ ids });
  });

  router.post('/unsave', async (req, res) => {
    const user = await getUser(req);
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).send();
      return;
    }
    await store.markUnsaved({ user_ref: user, ids });
    res.status(200).send({ ids });
  });

  router.post('/notifications', async (req, res) => {
    const { entityRef, title, description, link } = req.body;
    const notifications = [];
    let users = [];

    try {
      await authenticateService(req);
    } catch (e) {
      logger.error(`Failed to authenticate notification request ${e}`);
      res.status(401).send();
      return;
    }

    try {
      users = await getUsersForEntityRef(entityRef);
    } catch (e) {
      logger.error(`Failed to resolve notification receiver ${e}`);
      res.status(400).send();
      return;
    }

    const baseNotification = {
      id: uuid(),
      title,
      description,
      link,
      created: new Date(),
      saved: false,
    };

    for (const user of users) {
      let notification = { ...baseNotification, userRef: user };
      for (const processor of processors ?? []) {
        notification = processor.decorate
          ? await processor.decorate(notification)
          : notification;
      }

      await store.saveNotification(notification);
      for (const processor of processors ?? []) {
        if (processor.send) {
          processor.send(notification);
        }
      }
      notifications.push(notification);
      // TODO: Signal service
    }

    res.send(notifications);
  });

  router.use(errorHandler());
  return router;
}
