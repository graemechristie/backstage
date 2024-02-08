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
import { EventSubscriber, EventParams } from '@backstage/plugin-events-node';
import { Logger } from 'winston';
import { DevopsMetricStore, DevopsEvent } from './DevopsMetricDatabase';

export class DevopsEventSubscriber implements EventSubscriber {
  logger: Logger;
  database: DevopsMetricStore;

  constructor(logger: Logger, database: DevopsMetricStore) {
    this.logger = logger;
    this.database = database;
  }

  supportsEventTopics() {
    return ['github']; // presumably this will be dynamically configured/passed in in the future ...
  }

  async onEvent(params: EventParams) {
    this.logger.info(`received ${params.topic} event`);
    this.logger.info(JSON.stringify(params, null, 4));
    const newEvent: DevopsEvent = {
      event: params.eventPayload as object,
      timestamp: Date.now(),
    };
    try {
      this.database.insertEvent(newEvent);
    } catch (error) {
      this.logger.error(
        `There was an error writing the event to the database: ${error}`,
      );
    }
  }
}
