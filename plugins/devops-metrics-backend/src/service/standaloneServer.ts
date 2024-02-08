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

// TOD: I'm not sure this works (Ive been running the ful backstage stack to test). @wsoo might be an easy first issue to pick up

import {
  createServiceBuilder,
  DatabaseManager,
} from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';
import { EventBroker, EventParams } from '@backstage/plugin-events-node';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

function createEventBroker(): EventBroker {
  const published: EventParams[] = [];
  return {
    publish: (params: EventParams) => {
      published.push(params);
    },
  } as EventBroker;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'devops-metrics-backend' });
  logger.debug('Starting application server...');

  const manager = DatabaseManager.fromConfig(
    new ConfigReader({
      backend: {
        database: { client: 'better-sqlite3', connection: ':memory:' },
      },
    }),
  );
  const database = manager.forPlugin('devops-metrics');
  const eventBroker = createEventBroker();

  const router = await createRouter({
    logger,
    database,
    eventBroker,
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/bunnings-events', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
