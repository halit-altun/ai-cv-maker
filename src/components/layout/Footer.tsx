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
  useTheme,
  useMediaQuery,
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
  LocationOn
} from '@mui/icons-material';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const footerLinks = {
    product: [
      { name: 'CV Oluşturucu', href: '/cv-maker-ai', icon: <AutoAwesome /> },
      { name: 'Şirket Bazlı CV Düzenleme', href: '/company-cv-editor', icon: <AutoAwesome /> },
      { name: 'AI Başvuru Maili', href: '/ai-cover-letter', icon: <Email /> },
      { name: 'Toplu Mail Gönderme', href: '/bulk-email', icon: <Email /> }
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
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {/* Logo ve Açıklama */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  width: 48,
                  height: 48,
                  mr: 2
                }}
              >
                <AutoAwesome />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                CV AI Maker
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: 1.6,
                mb: 3
              }}
            >
              AI destekli CV oluşturma ve iş başvuru süreçlerinizi optimize edin. 
              Modern teknoloji ile kariyerinizi ileriye taşıyın.
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
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Ürün
            </Typography>
            <Stack spacing={2}>
              {footerLinks.product.map((link, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {link.icon}
                  {link.name}
                </MuiLink>
              ))}
            </Stack>
          </Grid>

          {/* Destek Linkleri */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Destek
            </Typography>
            <Stack spacing={2}>
              {footerLinks.support.map((link, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {link.name}
                </MuiLink>
              ))}
            </Stack>
          </Grid>

          {/* Şirket Linkleri */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Şirket
            </Typography>
            <Stack spacing={2}>
              {footerLinks.company.map((link, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'white',
                      transform: 'translateX(4px)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {link.name}
                </MuiLink>
              ))}
            </Stack>
          </Grid>

          {/* Sosyal Medya ve Newsletter */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Bizi Takip Edin
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              {socialLinks.map((social, index) => (
                <IconButton
                  key={index}
                  href={social.href}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>
            
            <Chip
              label="AI Powered"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            © {currentYear} CV AI Maker. Tüm hakları saklıdır.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Made with ❤️ in Turkey
            </Typography>
          </Box>
        </Box>
      </Container>
    </Paper>
  );
};

export default Footer;
