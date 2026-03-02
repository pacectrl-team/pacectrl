import { Box, Container, Typography, Stack } from '@mui/material'

function AboutPage() {
  return (
    <Box sx={{ minHeight: '100vh', background: '#F0F7F4' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          pt: { xs: 10, md: 14 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 20% 50%, rgba(85, 239, 196, 0.1) 0%, transparent 50%)',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={4} alignItems="center" textAlign="center">
            <Typography
              variant="overline"
              sx={{
                color: '#6BCB77',
                letterSpacing: 4,
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              About Us
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 800,
                color: '#fff',
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                maxWidth: '900px',
                lineHeight: 1.1,
              }}
            >
              Pioneering Sustainable
              <br />
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(135deg, #55EFC4, #6BCB77)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Maritime Solutions
              </Box>
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                maxWidth: '700px',
                fontWeight: 400,
                lineHeight: 1.7,
              }}
            >
              A student-led initiative from Åbo Akademi, mentored by Demola, committed to
              transforming the shipping industry through innovation and sustainability.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Mission Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={6}
          alignItems="center"
        >
          <Box sx={{ flex: 1 }}>
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#27AE60',
                    fontWeight: 700,
                    letterSpacing: 2,
                    fontSize: '0.85rem',
                  }}
                >
                  Our Mission
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    color: '#1B4332',
                    mt: 1,
                    mb: 3,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                  }}
                >
                  Empowering Greener Shipping
                </Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{ color: '#2D3436', lineHeight: 1.9, fontSize: '1.1rem' }}
              >
                We are Team PaceCtrl from Åbo Akademi, working under the mentorship of Demola to
                revolutionize maritime operations. Our platform provides comprehensive tools for
                managing voyages, ships, and emissions with unprecedented efficiency.
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          py: 4,
          mt: 4,
        }}
      >
        <Container maxWidth="lg">
          <Stack alignItems="center">
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}
            >
              © 2026 Team PaceCtrl. All rights reserved.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}

export default AboutPage
