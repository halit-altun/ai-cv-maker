'use client';

import Link from 'next/link';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import { dashboardCopy } from '../../constants/copy';
import { appRoutes } from '../../constants/routes';
import { dashboardTokens } from '../../styles/dashboardTokens';

const footerLinks = [
  { label: dashboardCopy.privacyPolicy, href: appRoutes.privacy },
  { label: dashboardCopy.termsOfService, href: appRoutes.terms },
  { label: dashboardCopy.cookies, href: appRoutes.cookies },
] as const;

export function DashboardFooter() {
  const { colors, fonts } = dashboardTokens;

  const linkSx = {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: '14px',
    letterSpacing: '0.02em',
    fontWeight: 500,
    color: colors.onSurfaceVariant,
    textDecoration: 'none',
    transition: 'color 0.2s',
    '&:hover': { color: colors.secondary },
  };

  return (
    <Box
      component="footer"
      sx={{
        mt: 8,
        py: 2,
        borderTop: `1px solid ${colors.outlineVariant}`,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography sx={linkSx}>{dashboardCopy.footerCopyright}</Typography>
      <Box sx={{ display: 'flex', gap: 3 }}>
        {footerLinks.map((link) => (
          <MuiLink key={link.href} component={Link} href={link.href} sx={linkSx}>
            {link.label}
          </MuiLink>
        ))}
      </Box>
    </Box>
  );
}
