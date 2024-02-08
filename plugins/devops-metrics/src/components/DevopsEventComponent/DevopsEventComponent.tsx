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
  configApiRef,
  useApi,
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import { eventContentRouteRef } from '../../plugin';
import useAsync from 'react-use/lib/useAsync';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  HeaderLabel,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';

import { DevopsEvent } from '../../types';

export const DevopsEventComponent = () => {
  const { eventId } = useRouteRefParams(eventContentRouteRef);
  const config = useApi(configApiRef);
  const { value, loading, error } = useAsync(async (): Promise<DevopsEvent> => {
    const backendBaseUrl = config.getString('backend.baseUrl');
    const backendApiEndPoint = `${backendBaseUrl}/api/devops-metrics/events/${eventId}`;
    const bunningsEventData = await fetch(backendApiEndPoint)
      .then(res => (res.ok ? res : Promise.reject(res)))
      .then(res => res.json());

    return bunningsEventData;
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return (
    <Page themeId="tool">
      <Header
        title="Devops Events"
        subtitle="List of Events received by the Backstage Devops Metrics System"
      >
        <HeaderLabel label="Lifecycle" value="Alpha" />
      </Header>
      <Content>
        <ContentHeader title={`Event ${eventId}`} />
        <InfoCard
          deepLink={{
            title: 'Back',
            link: '../',
          }}
        >
          {JSON.stringify(value?.event)}
        </InfoCard>
      </Content>
    </Page>
  );
};
