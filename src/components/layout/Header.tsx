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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  Divider,
  Paper,
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
  Dashboard,
  Person
} from '@mui/icons-material';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems = [
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          backgroundColor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.8)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <Avatar
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
                  width: 40,
                  height: 40,
                  mr: 1
                }}
              >
                <AutoAwesome />
              </Avatar>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                CV AI Maker
              </Typography>
            </Link>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {navigationItems.map((item, index) => (
                <Tooltip
                  key={index}
                  title={item.description}
                  placement="bottom"
                  arrow
                  TransitionComponent={Fade}
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
                      fontWeight: 500,
                      px: 2,
                      py: 1,
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: `${item.color}.main`,
                        backgroundColor: `${item.color}.light`,
                        color: `${item.color}.main`,
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      },
                      transition: 'all 0.2s ease-in-out'
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
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: 320,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                width: 40,
                height: 40,
                mr: 2
              }}
            >
              <AutoAwesome />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              CV AI Maker
            </Typography>
          </Box>
          
          <List sx={{ mt: 2 }}>
            {navigationItems.map((item, index) => (
              <ListItem
                key={index}
                component={Link}
                href={item.href}
                onClick={handleMobileMenuToggle}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateX(4px)'
                  },
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: 500,
                    color: 'white'
                  }}
                  secondaryTypographyProps={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem'
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
