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
import { Typography, Grid } from '@material-ui/core';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  HeaderLabel,
  SupportButton,
} from '@backstage/core-components';
import { DevopsEventsListComponent } from '../DevopsEventsListComponent';

export const DevopsEventsComponent = () => (
  <Page themeId="tool">
    <Header
      title="Devops Events"
      subtitle="List of Events received by the Backstage Devops Metrics System"
    >
      <HeaderLabel label="Lifecycle" value="Alpha" />
    </Header>
    <Content>
      <ContentHeader title="Bunnings Events">
        <SupportButton>
          Lists Events received by the Backstage Devops Metrics System.
        </SupportButton>
      </ContentHeader>
      <Grid container spacing={3} direction="column">
        <Grid item>
          <InfoCard>
            <Typography variant="body1">
              These events have been received by the backstage events system and
              indexed in the backstage backend database. Currently these event
              are not routed to any external system and are simply stored here,
              and available to view though this UI.
            </Typography>
          </InfoCard>
        </Grid>
        <Grid item>
          <DevopsEventsListComponent />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
