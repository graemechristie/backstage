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
import React from 'react';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
  Link,
  OverflowTooltip,
} from '@backstage/core-components';
import { configApiRef, useApi, useRouteRef } from '@backstage/core-plugin-api';
import { eventContentRouteRef } from '../../plugin';
import { DevopsEvent, DevopsEventItem } from '../../types';
import useAsync from 'react-use/lib/useAsync';

type DenseTableProps = {
  events: DevopsEvent[];
};

export const DenseTable = ({ events }: DenseTableProps) => {
  const columns: TableColumn<DevopsEventItem>[] = [
    { title: 'Timestamp', field: 'timestamp' },
    { title: 'Id', field: 'id' },
    {
      title: 'Content',
      field: 'eventText',
      render: ({ eventLink, eventText }) => (
        <Link to={eventLink}>
          <OverflowTooltip text={eventText} />
        </Link>
      ),
    },
  ];

  const contentRoute = useRouteRef(eventContentRouteRef);
  const data = events.map(event => {
    return {
      timestamp: event.timestamp,
      id: event.id,
      eventLink: contentRoute({ eventId: event.id || '' }),
      eventText: JSON.stringify(event.event),
    };
  });

  return (
    <Table
      title="Recent Events"
      options={{ search: true, paging: false }}
      columns={columns}
      data={data}
    />
  );
};

export const DevopsEventsListComponent = () => {
  const config = useApi(configApiRef);
  const { value, loading, error } = useAsync(async (): Promise<
    DevopsEvent[]
  > => {
    const backendBaseUrl = config.getString('backend.baseUrl');
    const backendApiEndPoint = `${backendBaseUrl}/api/devops-metrics/events`;
    const devopsEventData = await fetch(backendApiEndPoint)
      .then(res => (res.ok ? res : Promise.reject(res)))
      .then(res => res.json());

    return devopsEventData;
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return <DenseTable events={value || []} />;
};
