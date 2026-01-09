# CareBot - Patient Healthcare Chatbot PRD

## Original Problem Statement
Create an AI-powered chatbot that acts as a first point of contact for patients, helping them understand symptoms, get basic guidance, and decide whether they need a doctor or simple over-the-counter care.

## Architecture & Tech Stack
- **Backend**: FastAPI (Python) with async MongoDB via Motor
- **Frontend**: React with Tailwind CSS + Shadcn UI components
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via emergentintegrations library
- **Auth**: JWT-based custom authentication
- **Design**: Clinical Zen theme (Medical/Clinical look)

## User Personas
1. **Patient**: Seeking quick health guidance, symptom assessment, and doctor booking
2. **Healthcare Seeker**: Looking for first-level triage before visiting a clinic

## Core Requirements (Static)
1. AI-powered symptom chat with severity classification
2. Patient authentication (register/login)
3. Doctor availability and appointment booking
4. OTC medication suggestions with disclaimers
5. Safety boundaries (no serious diagnosis, emergency escalation)
6. Chat history and session management

## What's Been Implemented (January 3, 2025)

### Backend APIs (100% Complete)
- ✅ POST /api/auth/register - User registration
- ✅ POST /api/auth/login - User authentication  
- ✅ GET /api/auth/me - Get current user
- ✅ POST /api/chat/message - Send chat message & get AI response
- ✅ GET /api/chat/sessions - List chat sessions
- ✅ GET /api/chat/sessions/{id}/messages - Get session messages
- ✅ DELETE /api/chat/sessions/{id} - Delete session
- ✅ GET /api/doctors - List all doctors (mock data)
- ✅ GET /api/doctors/{id} - Get doctor details
- ✅ POST /api/appointments - Book appointment
- ✅ GET /api/appointments - List appointments
- ✅ PATCH /api/appointments/{id}/cancel - Cancel appointment

### Frontend Pages (100% Complete)
- ✅ Landing Page - Hero, features, CTA
- ✅ Login/Register Pages - Split screen design
- ✅ Dashboard - Stats, recent chats, upcoming appointments
- ✅ Chat Page - AI conversation interface with severity badges
- ✅ Doctors Page - Doctor cards with booking modal
- ✅ Appointments Page - Upcoming/Past tabs with cancel

### Features
- ✅ Claude Sonnet 4.5 AI integration for symptom analysis
- ✅ Severity classification (Mild/Consultation/Emergency)
- ✅ OTC suggestions with disclaimers
- ✅ Emergency alerts with escalation guidance
- ✅ Mock doctor database with availability slots
- ✅ JWT authentication with protected routes
- ✅ Clinical Zen design theme
- ✅ Responsive design (mobile-friendly)

## Prioritized Backlog

### P0 (Critical) - Completed
- [x] Core AI chat functionality
- [x] User authentication
- [x] Doctor booking flow
- [x] Appointment management

### P1 (High Priority) - Future
- [ ] Email notifications for appointments
- [ ] Follow-up reminders
- [ ] Symptom tracking over time
- [ ] PDF export of chat transcripts

### P2 (Medium Priority) - Future
- [ ] Real doctor database integration
- [ ] Video consultation feature
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Health score calculation

### P3 (Low Priority) - Future
- [ ] Medication reminder integration
- [ ] Wearable device sync
- [ ] Community health forums
- [ ] Telehealth integrations

## Next Tasks
1. Add email notifications for appointment confirmations
2. Implement follow-up reminders via scheduled jobs
3. Add symptom tracking dashboard with charts
4. Integrate with real doctor scheduling APIs

## Voice Features Update (January 4, 2025)

### New Features Implemented
- ✅ Voice Input (Speech-to-Text) using OpenAI Whisper
- ✅ Voice Output (Text-to-Speech) using ElevenLabs
- ✅ Toggle mode for voice recording (tap to start/stop)
- ✅ Speaker button on AI responses for audio playback

### New Backend Endpoints
- POST /api/voice/speech-to-text - Convert audio to text (Whisper)
- POST /api/voice/text-to-speech - Convert text to audio (ElevenLabs)
- GET /api/voice/voices - List available ElevenLabs voices

### Frontend Updates
- Microphone button added to chat input (toggle mode)
- Speaker/volume button on AI response messages
- Recording indicator with visual feedback
- Proper error handling for microphone access

### API Keys Required
- EMERGENT_LLM_KEY (for Whisper STT) - ✅ Configured
- ELEVENLABS_API_KEY (for TTS) - ⚠️ Needs valid key

### Note
ElevenLabs TTS requires a valid API key from https://elevenlabs.io/app/settings/api-keys
The current key is a placeholder. Replace with a real key to enable voice output.
