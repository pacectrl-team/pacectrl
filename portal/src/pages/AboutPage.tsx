import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Container,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import SpeedIcon from '@mui/icons-material/SpeedRounded'
import WidgetsIcon from '@mui/icons-material/WidgetsRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded'
import EcoIcon from '@mui/icons-material/NatureRounded'

// --- Constants for the live speed demo ---
const SPEED_MAX_KN = 22   // reference (full-speed) in knots
const SPEED_MIN_KN = 15   // minimum selectable speed
const SPEED_DEFAULT_KN = 22

/**
 * Calculates the approximate fuel (and CO₂) saving when slowing from
 * full speed to the chosen speed, using the cubic relationship between
 * ship speed and propulsive power: saving = 1 − (v / v_max)³
 */
function calcEmissionsSaving(speedKn: number): number {
  return Math.round((1 - Math.pow(speedKn / SPEED_MAX_KN, 3)) * 100)
}

/**
 * Returns how many extra minutes the voyage takes relative to the
 * full-speed baseline, assuming a representative 8-hour crossing.
 */
function calcExtraMinutes(speedKn: number): number {
  const baseHours = 8
  const slowHours = baseHours * (SPEED_MAX_KN / speedKn)
  return Math.round((slowHours - baseHours) * 60)
}

// --- Team data ---
const TEAM = [
  { name: 'Fredrik Lehto', role: 'Project Manager', photo: '/fredrik.png' },
  { name: 'Jonathan Back', role: 'Backend', photo: '/jonathan.png' },
  { name: 'Md Hasan', role: 'Frontend', photo: '/hasan.png' },
  { name: 'Nora Wallenius', role: 'Design', photo: '/nora.png' },
]

// --- How-It-Works steps ---
const HOW_IT_WORKS = [
  {
    icon: <WidgetsIcon sx={{ fontSize: 36, color: '#55EFC4' }} />,
    step: '01',
    title: 'Widget Embedded',
    description:
      'Ferry operators drop a single script tag into their checkout page. The widget fetches voyage-specific configuration — speed limits, branding, and emissions data — from the PaceCtrl API.',
  },
  {
    icon: <SpeedIcon sx={{ fontSize: 36, color: '#55EFC4' }} />,
    step: '02',
    title: 'Passenger Chooses Speed',
    description:
      'Passengers drag an interactive slider to trade travel time for fewer emissions. Real-time feedback shows the estimated CO₂ saving and extra minutes before they confirm their choice.',
  },
  {
    icon: <CheckCircleIcon sx={{ fontSize: 36, color: '#55EFC4' }} />,
    step: '03',
    title: 'Booking Confirmed',
    description:
      'After payment, the operator backend posts a webhook to PaceCtrl. The passenger intent is confirmed and the aggregate data flows into the operator analytics dashboard.',
  },
]

function AboutPage() {
  // Controlled state for the interactive speed demo slider
  const [demoSpeed, setDemoSpeed] = useState<number>(SPEED_DEFAULT_KN)
  const saving = calcEmissionsSaving(demoSpeed)
  const extraMins = calcExtraMinutes(demoSpeed)

  return (
    <Box sx={{ minHeight: '100vh', background: '#F0F7F4' }}>

      {/* ── Hero ── */}
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
            top: 0, left: 0, right: 0, bottom: 0,
            background:
              'radial-gradient(circle at 20% 50%, rgba(85, 239, 196, 0.1) 0%, transparent 50%)',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={4} alignItems="center" textAlign="center">
            <Typography
              variant="overline"
              sx={{ color: '#6BCB77', letterSpacing: 4, fontWeight: 700, fontSize: '0.9rem' }}
            >
              ICT Showroom 2026 · Åbo Akademi × Demola
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 800,
                color: '#fff',
                fontSize: { xs: '2rem', sm: '3rem', md: '4.5rem' },
                maxWidth: '900px',
                lineHeight: 1.2,
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
                maxWidth: '720px',
                fontWeight: 400,
                lineHeight: 1.7,
              }}
            >
              PaceCtrl is a student-led project from Åbo Akademi, developed in collaboration with
              Demola. We help ferry operators offer greener, slower voyages by surfacing
              speed-and-emissions trade-offs directly to passengers during booking — at no extra cost
              to either side.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* ── The Problem ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Box>
            <Typography
              variant="overline"
              sx={{ color: '#27AE60', fontWeight: 700, letterSpacing: 2, fontSize: '0.85rem' }}
            >
              Why Speed Matters
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#1B4332',
                mt: 1,
                mb: 3,
                fontSize: { xs: '1.75rem', md: '2.5rem' },
              }}
            >
              Slow Down, Cut Emissions
            </Typography>
          </Box>
          <Typography
            variant="body1"
            sx={{ color: '#2D3436', lineHeight: 1.9, fontSize: '1.1rem', maxWidth: '780px' }}
          >
            Ship propulsion follows a cubic law — reducing speed by just 10% cuts fuel consumption
            by roughly 27%. Yet passengers are rarely given the choice. A survey conducted as part
            of this project confirmed that many travelers are willing to arrive slightly later if it
            means meaningfully fewer emissions. PaceCtrl turns that willingness into action by
            embedding the choice directly into the booking flow operators already use.
          </Typography>

          {/* Highlighted stat trio */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            justifyContent="center"
            sx={{ pt: 2, width: '100%' }}
          >
            {[
              { stat: '~27%', label: 'less fuel at −10% speed' },
              { stat: '~50%', label: 'less fuel at −20% speed' },
              { stat: '0 €', label: 'extra cost for passengers' },
            ].map(({ stat, label }) => (
              <Paper
                key={label}
                elevation={0}
                sx={{
                  flex: 1,
                  maxWidth: { xs: '100%', sm: 220 },
                  py: { xs: 2.5, sm: 4 },
                  px: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #55EFC4, #6BCB77)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: { xs: 0.5, sm: 1 },
                    lineHeight: 1.1,
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
                  }}
                >
                  {stat}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {label}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>

      {/* ── Mission ── */}
      <Box sx={{ background: '#fff', py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="overline"
                sx={{ color: '#27AE60', fontWeight: 700, letterSpacing: 2, fontSize: '0.85rem' }}
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
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                }}
              >
                Empowering Greener Shipping
              </Typography>
              <Stack spacing={2.5}>
                <Typography
                  variant="body1"
                  sx={{ color: '#2D3436', lineHeight: 1.9, fontSize: '1.1rem' }}
                >
                  We are Team PaceCtrl from Åbo Akademi, working under the mentorship of Demola.
                  Our aim is to make sustainable choices the default — not an afterthought — for
                  passengers and operators alike. Maritime shipping accounts for roughly 3% of
                  global CO₂ emissions, and passenger ferries are a uniquely approachable segment
                  to influence: routes are fixed, voyages are predictable, and passengers are
                  already in a decision-making mindset when they book.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: '#2D3436', lineHeight: 1.9, fontSize: '1.1rem' }}
                >
                  PaceCtrl achieves this through a lightweight embeddable widget that operators
                  integrate into their existing checkout pages, an authenticated portal for voyage
                  configuration and analytics, and a secure webhook flow that links passenger
                  choices to confirmed bookings. The system is designed to be adopted with minimal
                  engineering effort on the operator side while providing rich, actionable data on
                  the back end.
                </Typography>
              </Stack>
            </Box>
            {/* Icon accent */}
            <Box
              sx={{
                flex: '0 0 auto',
                width: { xs: 120, md: 180 },
                height: { xs: 120, md: 180 },
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EcoIcon sx={{ fontSize: { xs: 60, md: 90 }, color: '#55EFC4' }} />
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ── How It Works ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack spacing={6} alignItems="center">
          <Box textAlign="center">
            <Typography
              variant="overline"
              sx={{ color: '#27AE60', fontWeight: 700, letterSpacing: 2, fontSize: '0.85rem' }}
            >
              The System
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#1B4332',
                mt: 1,
                fontSize: { xs: '1.75rem', md: '2.5rem' },
              }}
            >
              How It Works
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ width: '100%' }}>
            {HOW_IT_WORKS.map(({ icon, step, title, description }) => (
              <Paper
                key={step}
                elevation={0}
                sx={{
                  flex: 1,
                  p: 4,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Large step number watermark */}
                <Typography
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: 16,
                    fontSize: '6rem',
                    fontWeight: 900,
                    color: 'rgba(255,255,255,0.06)',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {step}
                </Typography>
                <Stack spacing={2}>
                  {icon}
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8 }}>
                    {description}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>

      {/* ── Interactive Speed Demo ── */}
      <Box sx={{ background: '#fff', py: { xs: 8, md: 10 } }}>
        <Container maxWidth="sm">
          <Stack spacing={5} alignItems="center" textAlign="center">
            <Box>
              <Typography
                variant="overline"
                sx={{ color: '#27AE60', fontWeight: 700, letterSpacing: 2, fontSize: '0.85rem' }}
              >
                Try It
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: '#1B4332',
                  mt: 1,
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                }}
              >
                Speed vs. Emissions
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: '#636e72', lineHeight: 1.8, mt: 2 }}
              >
                Drag the slider to see how reducing a vessel's speed affects estimated emissions
                savings for an 8-hour crossing, using the cubic power law.
              </Typography>
            </Box>

            {/* Slider */}
            <Box sx={{ width: '100%', px: 2 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#636e72' }}>
                  {SPEED_MIN_KN} kn (slowest)
                </Typography>
                <Typography variant="caption" sx={{ color: '#636e72' }}>
                  {SPEED_MAX_KN} kn (full speed)
                </Typography>
              </Stack>
              <Slider
                value={demoSpeed}
                min={SPEED_MIN_KN}
                max={SPEED_MAX_KN}
                step={0.5}
                onChange={(_e, val) => setDemoSpeed(val as number)}
                aria-label="Vessel speed in knots"
                sx={{
                  color: '#2D6A4F',
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    backgroundColor: '#55EFC4',
                    border: '3px solid #1B4332',
                  },
                  '& .MuiSlider-track': { height: 8, borderRadius: 4 },
                  '& .MuiSlider-rail': { height: 8, borderRadius: 4, backgroundColor: '#b2dfdb' },
                }}
              />
              <Typography
                variant="h6"
                sx={{ textAlign: 'center', mt: 1, color: '#1B4332', fontWeight: 700 }}
              >
                {demoSpeed} knots
              </Typography>
            </Box>

            {/* Result display */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ width: '100%' }}>
              {/* Emissions saving */}
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  py: { xs: 3, sm: 5 },
                  px: { xs: 2, sm: 4 },
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  textAlign: 'center',
                }}
              >
                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>
                  Estimated CO₂ Saving
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #55EFC4, #6BCB77)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    my: { xs: 0.5, sm: 1.5 },
                    lineHeight: 1,
                    fontSize: { xs: '3rem', sm: '3.25rem', md: '3.5rem' }
                  }}
                >
                  {saving}%
                </Typography>
                {/* Progress bar */}
                <Box
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.15)',
                    overflow: 'hidden',
                    mt: { xs: 1.5, sm: 2 },
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${saving}%`,
                      background: 'linear-gradient(90deg, #55EFC4, #6BCB77)',
                      borderRadius: 4,
                      transition: 'width 0.25s ease',
                    }}
                  />
                </Box>
              </Paper>

              {/* Extra travel time */}
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  py: { xs: 3, sm: 5 },
                  px: { xs: 2, sm: 4 },
                  borderRadius: 3,
                  background: '#f8fffe',
                  border: '2px solid #b2dfdb',
                  textAlign: 'center',
                }}
              >
                <Typography variant="overline" sx={{ color: '#636e72', letterSpacing: 2 }}>
                  Extra Travel Time
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 900,
                    color: '#1B4332',
                    my: { xs: 0.5, sm: 1.5 },
                    lineHeight: 1,
                    fontSize: { xs: '3rem', sm: '3.25rem', md: '3.5rem' }
                  }}
                >
                  +{extraMins}m
                </Typography>
                <Typography variant="body2" sx={{ color: '#636e72' }}>
                  on an 8-hour crossing
                </Typography>
              </Paper>
            </Stack>

            <Typography variant="caption" sx={{ color: '#b2bec3', maxWidth: 420 }}>
              Based on the cubic relationship between ship speed and propulsive power.
              Actual savings vary by vessel type, load, and sea conditions.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* ── Team ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack spacing={6} alignItems="center">
          <Box textAlign="center">
            <Typography
              variant="overline"
              sx={{ color: '#27AE60', fontWeight: 700, letterSpacing: 2, fontSize: '0.85rem' }}
            >
              The People
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#1B4332',
                mt: 1,
                fontSize: { xs: '1.75rem', md: '2.5rem' },
              }}
            >
              Meet the Team
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: '#636e72', mt: 2, maxWidth: 560, mx: 'auto' }}
            >
              A four-person student team from Åbo Akademi, working in collaboration with Demola
              throughout the 2025–2026 project course.
            </Typography>
          </Box>

          <Stack
            direction="row"
            justifyContent="center"
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: { xs: 2, sm: 3 },
            }}
          >
            {TEAM.map(({ name, role, photo }) => (
              <Card
                key={name}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  textAlign: 'center',
                  height: '100%',
                }}
              >
                <CardContent sx={{ py: { xs: 3, sm: 4 }, px: { xs: 1.5, sm: 2 } }}>
                  {/* Photo avatar */}
                  <Box
                    sx={{
                      width: { xs: 72, sm: 96 },
                      height: { xs: 72, sm: 96 },
                      borderRadius: 2,
                      border: '2px solid #55EFC4',
                      overflow: 'hidden',
                      mx: 'auto',
                      mb: { xs: 1.5, sm: 2 },
                      background: 'rgba(85, 239, 196, 0.12)',
                    }}
                  >
                    <img
                      src={photo}
                      alt={name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', fontSize: { xs: '0.9rem', sm: '1rem' }, lineHeight: 1.2 }}>
                    {name}
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-block',
                      mt: { xs: 0.5, sm: 1 },
                      px: { xs: 1, sm: 1.5 },
                      py: { xs: 0.2, sm: 0.4 },
                      borderRadius: 10,
                      background: 'rgba(85, 239, 196, 0.15)',
                      border: '1px solid rgba(85, 239, 196, 0.35)',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#55EFC4', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      {role}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Container>

      {/* ── Footer ── */}
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
              © 2026 Team PaceCtrl · Åbo Akademi × Demola · All rights reserved.
            </Typography>
          </Stack>
        </Container>
      </Box>

    </Box>
  )
}

export default AboutPage
