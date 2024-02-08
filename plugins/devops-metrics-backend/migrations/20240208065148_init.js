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

exports.up = async function (knex) {
  await knex.schema.createTable('devops_events', table => {
    table.comment('The table of Devops Events');
    table
      .bigIncrements('index')
      .notNullable()
      .comment('An insert counter to ensure ordering');
    table.uuid('id').notNullable().comment('The ID of the code coverage');
    table
      .bigint('timestamp')
      .notNullable()
      .comment('The timestamp of the event');
    table
      .text('event', 'text')
      .notNullable()
      .comment('The Event json as a string');
    table
      .dateTime('created_at')
      .defaultTo(knex.fn.now())
      .notNullable()
      .comment('The time this entry was created');
    table.index('index', 'devops_events_index_idx');
    table.index('id', 'devops_events_id_idx');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('bunnings_events', table => {
    table.dropIndex([], 'devops_events_index_idx');
    table.dropIndex([], 'devops_events_id_idx');
  });
  await knex.schema.dropTable('devops_events');
};
