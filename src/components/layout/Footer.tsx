'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link as MuiLink,
  IconButton,
  Avatar,
  Divider,
  Paper,
  Chip,
  Stack
} from '@mui/material';
import {
  LinkedIn,
  Twitter,
  GitHub,
  AutoAwesome,
  Email,
  Phone,
  LocationOn,
  Dashboard,
  Business,
  Send
} from '@mui/icons-material';

/** Header AppBar ile aynı görsel dil */
const footerBarGradient = 'linear-gradient(92deg, #1a2744 0%, #1c3050 42%, #1e3a5c 100%)';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Kontrol Paneli', href: '/dashboard', icon: <Dashboard fontSize="small" /> },
      { name: 'CV Oluşturucu', href: '/cv-maker-ai', icon: <AutoAwesome fontSize="small" /> },
      { name: 'Şirket Bazlı CV', href: '/company-based-cv-editor', icon: <Business fontSize="small" /> },
      { name: 'AI Başvuru Maili', href: '/ai-cover-letter', icon: <Email fontSize="small" /> },
      { name: 'Toplu Mail', href: '/bulk-email', icon: <Send fontSize="small" /> }
    ],
    support: [
      { name: 'Yardım Merkezi', href: '/help' },
      { name: 'İletişim', href: '/contact' },
      { name: 'SSS', href: '/faq' }
    ],
    company: [
      { name: 'Hakkımızda', href: '/about' },
      { name: 'Gizlilik Politikası', href: '/privacy' },
      { name: 'Kullanım Şartları', href: '/terms' }
    ]
  };

  const socialLinks = [
    { icon: <LinkedIn />, href: '#', label: 'LinkedIn' },
    { icon: <Twitter />, href: '#', label: 'Twitter' },
    { icon: <GitHub />, href: '#', label: 'GitHub' }
  ];

  return (
    <Paper
      component="footer"
      elevation={0}
      sx={{
        background: footerBarGradient,
        color: '#fff',
        mt: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -6px 28px rgba(15, 23, 42, 0.18)',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
        <Grid container spacing={4}>
          {/* Logo ve Açıklama */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
              <Avatar
                sx={{
                  background: 'linear-gradient(135deg, #5eb8ff 0%, #64b5f6 40%, #b39ddb 100%)',
                  width: 48,
                  height: 48,
                  mr: 2,
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
                }}
              >
                <AutoAwesome sx={{ fontSize: 26, color: '#0f172a' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                  CV AI Maker
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.68)', fontWeight: 500 }}>
                  AI destekli kariyer araçları
                </Typography>
              </Box>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.65,
                mb: 3,
                maxWidth: 340,
              }}
            >
              AI destekli CV oluşturma ve iş başvuru süreçlerinizi optimize edin. Modern teknoloji ile
              kariyerinizi ileriye taşıyın.
            </Typography>
            
            {/* İletişim Bilgileri */}
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.7)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  info@cvaimaker.com
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.7)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  +90 (555) 123 45 67
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.7)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  İstanbul, Türkiye
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Ürün Linkleri */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                mb: 2,
                color: '#fff',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                fontSize: '0.72rem',
                opacity: 0.9,
              }}
            >
              Ürün
            </Typography>
            <Stack spacing={1.5}>
              {footerLinks.product.map((link, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.78)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    '&:hover': {
                      color: '#fff',
                      transform: 'translateX(3px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <Box sx={{ display: 'flex', color: 'rgba(255, 255, 255, 0.55)' }}>{link.icon}</Box>
                  {link.name}
                </MuiLink>
              ))}
            </Stack>
          </Grid>

          {/* Destek Linkleri */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                mb: 2,
                color: '#fff',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                fontSize: '0.72rem',
                opacity: 0.9,
              }}
            >
              Destek
            </Typography>
            <Stack spacing={1.5}>
              {footerLinks.support.map((link, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.78)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    '&:hover': {
                      color: '#fff',
                      transform: 'translateX(3px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {link.name}
                </MuiLink>
              ))}
            </Stack>
          </Grid>

          {/* Şirket Linkleri */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                mb: 2,
                color: '#fff',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                fontSize: '0.72rem',
                opacity: 0.9,
              }}
            >
              Şirket
            </Typography>
            <Stack spacing={1.5}>
              {footerLinks.company.map((link, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.78)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    '&:hover': {
                      color: '#fff',
                      transform: 'translateX(3px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {link.name}
                </MuiLink>
              ))}
            </Stack>
          </Grid>

          {/* Sosyal Medya ve Newsletter */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                mb: 2,
                color: '#fff',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                fontSize: '0.72rem',
                opacity: 0.9,
              }}
            >
              Bizi takip edin
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
              {socialLinks.map((social, index) => (
                <IconButton
                  key={index}
                  component="a"
                  href={social.href}
                  aria-label={social.label}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.88)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.16)',
                      color: '#fff',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>

            <Chip
              label="AI Powered"
              size="small"
              sx={{
                height: 28,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.92)',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.22)',
                '& .MuiChip-label': { px: 1.25 },
              }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3.5, borderColor: 'rgba(255, 255, 255, 0.12)' }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>
            © {currentYear} CV AI Maker. Tüm hakları saklıdır.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>
              Made with ❤️ in Turkey
            </Typography>
          </Box>
        </Box>
      </Container>
    </Paper>
  );
};

export default Footer;
