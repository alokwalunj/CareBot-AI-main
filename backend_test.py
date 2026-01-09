#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class HealthcareChatbotAPITester:
    def __init__(self, base_url="https://carebot-15.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None
        self.appointment_id = None
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Status {response.status_code}, expected {expected_status}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                return False, error_msg

        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, f"Request error: {str(e)}"

    def test_health_check(self):
        """Test basic health endpoint"""
        success, response = self.make_request('GET', '', expected_status=200)
        self.log_test("Health Check", success, "" if success else response)
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_user = {
            "full_name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123",
            "age": 30,
            "existing_conditions": ["None"]
        }
        
        success, response = self.make_request('POST', 'auth/register', test_user, expected_status=200)
        
        if success and isinstance(response, dict):
            if 'access_token' in response and 'user' in response:
                self.token = response['access_token']
                self.user_data = response['user']
                self.log_test("User Registration", True)
                return True
            else:
                self.log_test("User Registration", False, "Missing token or user in response")
                return False
        else:
            self.log_test("User Registration", False, response)
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data from registration")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "testpass123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and isinstance(response, dict):
            if 'access_token' in response:
                self.token = response['access_token']
                self.log_test("User Login", True)
                return True
            else:
                self.log_test("User Login", False, "Missing token in response")
                return False
        else:
            self.log_test("User Login", False, response)
            return False

    def test_protected_route_access(self):
        """Test accessing protected route with token"""
        success, response = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and isinstance(response, dict):
            if 'email' in response:
                self.log_test("Protected Route Access", True)
                return True
            else:
                self.log_test("Protected Route Access", False, "Invalid user data in response")
                return False
        else:
            self.log_test("Protected Route Access", False, response)
            return False

    def test_chat_message(self):
        """Test sending chat message and receiving AI response"""
        chat_data = {
            "message": "I have a headache and feel tired. What should I do?",
            "session_id": None
        }
        
        success, response = self.make_request('POST', 'chat/message', chat_data, expected_status=200)
        
        if success and isinstance(response, dict):
            required_fields = ['id', 'session_id', 'role', 'content']
            if all(field in response for field in required_fields):
                if response['role'] == 'assistant' and len(response['content']) > 0:
                    self.session_id = response['session_id']
                    self.log_test("AI Chat Message", True)
                    return True
                else:
                    self.log_test("AI Chat Message", False, "Invalid AI response format")
                    return False
            else:
                self.log_test("AI Chat Message", False, f"Missing required fields: {required_fields}")
                return False
        else:
            self.log_test("AI Chat Message", False, response)
            return False

    def test_chat_sessions(self):
        """Test retrieving chat sessions"""
        success, response = self.make_request('GET', 'chat/sessions', expected_status=200)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                session = response[0]
                required_fields = ['id', 'user_id', 'title', 'created_at']
                if all(field in session for field in required_fields):
                    self.log_test("Chat Sessions Retrieval", True)
                    return True
                else:
                    self.log_test("Chat Sessions Retrieval", False, f"Missing session fields: {required_fields}")
                    return False
            else:
                self.log_test("Chat Sessions Retrieval", True, "No sessions found (expected for new user)")
                return True
        else:
            self.log_test("Chat Sessions Retrieval", False, response)
            return False

    def test_doctors_listing(self):
        """Test retrieving doctors list"""
        success, response = self.make_request('GET', 'doctors', expected_status=200)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                doctor = response[0]
                required_fields = ['id', 'name', 'specialty', 'experience_years', 'rating', 'available_slots']
                if all(field in doctor for field in required_fields):
                    self.log_test("Doctors Listing", True)
                    return True
                else:
                    self.log_test("Doctors Listing", False, f"Missing doctor fields: {required_fields}")
                    return False
            else:
                self.log_test("Doctors Listing", False, "No doctors found")
                return False
        else:
            self.log_test("Doctors Listing", False, response)
            return False

    def test_appointment_booking(self):
        """Test booking an appointment"""
        # First get doctors to book with
        success, doctors = self.make_request('GET', 'doctors', expected_status=200)
        if not success or not doctors:
            self.log_test("Appointment Booking", False, "Could not get doctors list")
            return False
            
        doctor = doctors[0]
        appointment_data = {
            "doctor_id": doctor['id'],
            "slot": doctor['available_slots'][0],
            "symptoms": "Headache and fatigue for testing",
            "notes": "Test appointment"
        }
        
        success, response = self.make_request('POST', 'appointments', appointment_data, expected_status=200)
        
        if success and isinstance(response, dict):
            required_fields = ['id', 'user_id', 'doctor_id', 'slot', 'symptoms', 'status']
            if all(field in response for field in required_fields):
                if response['status'] == 'scheduled':
                    self.appointment_id = response['id']
                    self.log_test("Appointment Booking", True)
                    return True
                else:
                    self.log_test("Appointment Booking", False, f"Unexpected status: {response['status']}")
                    return False
            else:
                self.log_test("Appointment Booking", False, f"Missing appointment fields: {required_fields}")
                return False
        else:
            self.log_test("Appointment Booking", False, response)
            return False

    def test_appointments_listing(self):
        """Test retrieving appointments list"""
        success, response = self.make_request('GET', 'appointments', expected_status=200)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                appointment = response[0]
                required_fields = ['id', 'doctor_name', 'doctor_specialty', 'slot', 'status']
                if all(field in appointment for field in required_fields):
                    self.log_test("Appointments Listing", True)
                    return True
                else:
                    self.log_test("Appointments Listing", False, f"Missing appointment fields: {required_fields}")
                    return False
            else:
                self.log_test("Appointments Listing", True, "No appointments found (expected for new user)")
                return True
        else:
            self.log_test("Appointments Listing", False, response)
            return False

    def test_appointment_cancellation(self):
        """Test cancelling an appointment"""
        if not self.appointment_id:
            self.log_test("Appointment Cancellation", False, "No appointment ID available")
            return False
            
        success, response = self.make_request('PATCH', f'appointments/{self.appointment_id}/cancel', expected_status=200)
        
        if success:
            # Verify the appointment was cancelled
            success_verify, appointments = self.make_request('GET', 'appointments', expected_status=200)
            if success_verify:
                cancelled_appointment = next((a for a in appointments if a['id'] == self.appointment_id), None)
                if cancelled_appointment and cancelled_appointment['status'] == 'cancelled':
                    self.log_test("Appointment Cancellation", True)
                    return True
                else:
                    self.log_test("Appointment Cancellation", False, "Appointment status not updated to cancelled")
                    return False
            else:
                self.log_test("Appointment Cancellation", False, "Could not verify cancellation")
                return False
        else:
            self.log_test("Appointment Cancellation", False, response)
            return False

    def test_voice_voices_endpoint(self):
        """Test getting available voices"""
        success, response = self.make_request('GET', 'voice/voices', expected_status=200)
        
        if success and isinstance(response, dict):
            if 'voices' in response and isinstance(response['voices'], list):
                if len(response['voices']) > 0:
                    voice = response['voices'][0]
                    required_fields = ['voice_id', 'name']
                    if all(field in voice for field in required_fields):
                        self.log_test("Voice Voices Endpoint", True)
                        return True
                    else:
                        self.log_test("Voice Voices Endpoint", False, f"Missing voice fields: {required_fields}")
                        return False
                else:
                    self.log_test("Voice Voices Endpoint", False, "No voices returned")
                    return False
            else:
                self.log_test("Voice Voices Endpoint", False, "Invalid response format - missing 'voices' array")
                return False
        else:
            self.log_test("Voice Voices Endpoint", False, response)
            return False

    def test_voice_text_to_speech(self):
        """Test text-to-speech conversion"""
        tts_data = {
            "text": "Hello, this is a test of the text to speech functionality.",
            "voice_id": "21m00Tcm4TlvDq8ikWAM"  # Default Rachel voice
        }
        
        success, response = self.make_request('POST', 'voice/text-to-speech', tts_data, expected_status=200)
        
        if success and isinstance(response, dict):
            required_fields = ['audio_base64', 'text']
            if all(field in response for field in required_fields):
                if len(response['audio_base64']) > 0 and response['text'] == tts_data['text']:
                    self.log_test("Voice Text-to-Speech", True)
                    return True
                else:
                    self.log_test("Voice Text-to-Speech", False, "Invalid audio data or text mismatch")
                    return False
            else:
                self.log_test("Voice Text-to-Speech", False, f"Missing TTS fields: {required_fields}")
                return False
        else:
            self.log_test("Voice Text-to-Speech", False, response)
            return False

    def test_voice_speech_to_text(self):
        """Test speech-to-text conversion (mock test since we can't generate real audio)"""
        # Create a minimal mock audio file for testing
        import io
        
        # Create a simple mock audio blob (this will likely fail but tests the endpoint)
        mock_audio = b"mock audio data for testing"
        
        # Use requests directly for file upload
        url = f"{self.base_url}/voice/speech-to-text"
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        files = {'audio_file': ('test.webm', io.BytesIO(mock_audio), 'audio/webm')}
        
        try:
            response = requests.post(url, files=files, headers=headers, timeout=30)
            
            # We expect this to fail with 500 due to invalid audio, but endpoint should exist
            if response.status_code in [200, 500]:
                if response.status_code == 500:
                    # Check if it's a transcription error (expected with mock data)
                    try:
                        error_data = response.json()
                        if 'Transcription failed' in str(error_data):
                            self.log_test("Voice Speech-to-Text Endpoint", True, "Endpoint exists (failed with mock audio as expected)")
                            return True
                    except:
                        pass
                elif response.status_code == 200:
                    # Unexpected success with mock data
                    self.log_test("Voice Speech-to-Text Endpoint", True, "Endpoint working (unexpected success with mock data)")
                    return True
                
                self.log_test("Voice Speech-to-Text Endpoint", False, f"Unexpected response: {response.status_code}")
                return False
            else:
                self.log_test("Voice Speech-to-Text Endpoint", False, f"Endpoint error: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Voice Speech-to-Text Endpoint", False, f"Request error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Healthcare Chatbot API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_protected_route_access,
            self.test_chat_message,
            self.test_chat_sessions,
            self.test_doctors_listing,
            self.test_appointment_booking,
            self.test_appointments_listing,
            self.test_appointment_cancellation,
            self.test_voice_voices_endpoint,
            self.test_voice_text_to_speech,
            self.test_voice_speech_to_text
        ]
        
        for test in tests:
            try:
                test()
                time.sleep(1)  # Brief pause between tests
            except Exception as e:
                self.log_test(test.__name__, False, f"Test exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = HealthcareChatbotAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())