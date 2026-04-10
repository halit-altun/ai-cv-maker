'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  Fade,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  AutoAwesome,
  Business,
  Email,
  Send,
  Dashboard
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

type NavColorKey = 'primary' | 'secondary' | 'success' | 'warning';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems = [
    {
      title: 'Kontrol Paneli',
      href: '/dashboard',
      description: 'Özet, hızlı işlemler ve modül kısayolları',
      icon: <Dashboard />,
      color: 'primary'
    },
    {
      title: 'CV Oluşturucu',
      href: '/cv-maker-ai',
      description: 'AI destekli CV oluşturma',
      icon: <AutoAwesome />,
      color: 'primary'
    },
    {
      title: 'Şirket Bazlı AI CV Düzenleme',
      href: '/company-cv-editor',
      description: 'Şirkete özel CV optimizasyonu',
      icon: <Business />,
      color: 'secondary'
    },
    {
      title: 'AI Başvuru Maili Hazırlama',
      href: '/ai-cover-letter',
      description: 'AI ile başvuru mektubu oluşturma',
      icon: <Email />,
      color: 'success'
    },
    {
      title: 'Toplu Mail Gönderme',
      href: '/bulk-email',
      description: 'Toplu başvuru maili gönderme',
      icon: <Send />,
      color: 'warning'
    }
  ];

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(92deg, #1a2744 0%, #1c3050 42%, #1e3a5c 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.25)',
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            py: 1.25,
            px: { xs: 1.5, sm: 2 },
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
          }}
        >
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <Avatar
                sx={{
                  background: 'linear-gradient(135deg, #5eb8ff 0%, #64b5f6 40%, #b39ddb 100%)',
                  width: 42,
                  height: 42,
                  mr: 1,
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
                }}
              >
                <AutoAwesome sx={{ fontSize: 22, color: '#0f172a' }} />
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column' }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 800, lineHeight: 1.15, color: '#fff' }}>
                  CV AI Maker
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255, 255, 255, 0.68)', fontWeight: 500, letterSpacing: 0.25 }}
                >
                  AI destekli kariyer araçları
                </Typography>
              </Box>
            </Link>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
              {navigationItems.map((item, index) => (
                <Tooltip
                  key={index}
                  title={item.description}
                  placement="bottom"
                  arrow
                  TransitionComponent={Fade}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: 'rgba(15, 23, 42, 0.94)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        border: '1px solid rgba(255,255,255,0.12)',
                        maxWidth: 280,
                      },
                    },
                    arrow: { sx: { color: 'rgba(15, 23, 42, 0.94)' } },
                  }}
                >
                  <Button
                    component={Link}
                    href={item.href}
                    startIcon={item.icon}
                    variant="outlined"
                    size="medium"
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 1.75,
                      py: 0.85,
                      fontSize: '0.8125rem',
                      color: 'rgba(255, 255, 255, 0.92)',
                      borderColor: 'rgba(255, 255, 255, 0.28)',
                      bgcolor: 'rgba(255, 255, 255, 0.06)',
                      '& .MuiButton-startIcon': { color: 'rgba(255, 255, 255, 0.88)' },
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.45)',
                        bgcolor: (t) => alpha(t.palette[item.color as NavColorKey].main, 0.22),
                        color: '#fff',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                        '& .MuiButton-startIcon': { color: '#fff' },
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {item.title}
                  </Button>
                </Tooltip>
              ))}
            </Box>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              onClick={handleMobileMenuToggle}
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobil menü — üst şerit header ile uyumlu, liste beyaz zemin */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: 320,
            maxWidth: '88vw',
            bgcolor: '#ffffff',
            borderLeft: '1px solid rgba(15, 23, 42, 0.1)',
            boxShadow: '-12px 0 40px rgba(15, 23, 42, 0.12)',
          },
        }}
      >
        <Box
          sx={{
            p: 2.5,
            background: 'linear-gradient(92deg, #1a2744 0%, #1e3a5c 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  background: 'linear-gradient(135deg, #5eb8ff 0%, #90caf9 50%, #b39ddb 100%)',
                  width: 44,
                  height: 44,
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
                }}
              >
                <AutoAwesome sx={{ color: '#0f172a' }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  CV AI Maker
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                  Menü — tüm modüller
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={handleMobileMenuToggle}
              sx={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ p: 2, pt: 2, bgcolor: '#ffffff' }}>
          <Typography variant="overline" sx={{ px: 1, color: 'text.disabled', letterSpacing: 1, fontWeight: 700 }}>
            Sayfalar
          </Typography>
          <List sx={{ mt: 1 }}>
            {navigationItems.map((item, index) => (
              <ListItem
                key={index}
                component={Link}
                href={item.href}
                onClick={handleMobileMenuToggle}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  py: 1.25,
                  border: '1px solid rgba(25, 118, 210, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    backgroundColor: 'rgba(227, 242, 253, 0.65)',
                    borderColor: `${item.color}.light`,
                    transform: 'translateX(-3px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                }}
              >
                <ListItemIcon sx={{ color: `${item.color}.main`, minWidth: 44 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: 700,
                    color: 'text.primary',
                    fontSize: '0.9rem',
                  }}
                  secondaryTypographyProps={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
