/*
 * Copyright 2024 The Backstage Authors
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
import { errorHandler, PluginDatabaseManager } from '@backstage/backend-common';
import { EventBroker } from '@backstage/plugin-events-node';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { DevopsMetricDatabase } from './DevopsMetricDatabase';
import { DevopsEventSubscriber } from './DevopsEventSubscriber';

export interface RouterOptions {
  logger: Logger;
  database: PluginDatabaseManager;
  eventBroker: EventBroker;
}

export const makeRouter = async (
  options: RouterOptions,
): Promise<express.Router> => {
  const { logger, database, eventBroker } = options;
  const devopsMetricDatabase = await DevopsMetricDatabase.create(database);
  eventBroker.subscribe(
    new DevopsEventSubscriber(logger, devopsMetricDatabase),
  );

  const router = Router();
  router.use(express.json());

  router.get('/events', async (_, response) => {
    const events = await devopsMetricDatabase.getEvents();

    logger.info(`Got ${events.length} Events`);
    response.json(events);
  });

  router.get('/events/:eventId', async (request, response) => {
    const eventId: string | undefined = request.params.eventId;

    if (!eventId) {
      response.sendStatus(500);
      return;
    }

    const event = await devopsMetricDatabase.getEvent(eventId);

    if (event === undefined) {
      response.sendStatus(404);
      return;
    }

    logger.info(`Got ${event.id} Events`);
    response.json(event);
  });

  router.use(errorHandler());
  return router;
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const logger = options.logger;

  logger.info('Initializing Devops Metrics backend');

  return makeRouter(options);
}
