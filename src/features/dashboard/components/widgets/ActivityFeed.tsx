'use client';

import {
  Box,
  Card,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';
import type { DashboardActivityItem } from '../../types';
import { SectionHeading } from '../common/SectionHeading';

interface ActivityFeedProps {
  title: string;
  kicker?: string;
  items: DashboardActivityItem[];
}

export function ActivityFeed({ title, kicker, items }: ActivityFeedProps) {
  return (
    <Box component="section">
      <SectionHeading title={title} kicker={kicker} />
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'rgba(15, 23, 42, 0.08)',
          borderRadius: 2,
        }}
      >
        <List disablePadding>
          {items.map((item, index) => (
            <Box key={item.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                sx={{
                  py: 2,
                  px: 2,
                  alignItems: 'flex-start',
                }}
              >
                <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                  <FiberManualRecord
                    sx={{
                      fontSize: 12,
                      color: 'primary.main',
                      opacity: 0.9,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary" display="block">
                        {item.detail}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                        {item.timeLabel}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </Box>
          ))}
        </List>
      </Card>
    </Box>
  );
}
