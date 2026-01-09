import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Star, 
  Clock, 
  Calendar,
  Briefcase,
  Search,
  Loader2,
  CheckCircle
} from "lucide-react";
import { doctorsAPI, appointmentsAPI } from "@/lib/api";
import { toast } from "sonner";

const DoctorsPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState({
    slot: "",
    symptoms: "",
    notes: ""
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await doctorsAPI.getAll();
        setDoctors(res.data);
      } catch (error) {
        toast.error("Failed to load doctors");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBookClick = (doctor) => {
    setSelectedDoctor(doctor);
    setBookingData({ slot: "", symptoms: "", notes: "" });
    setBookingSuccess(false);
    setBookingOpen(true);
  };

  const handleBookAppointment = async () => {
    if (!bookingData.slot || !bookingData.symptoms) {
      toast.error("Please select a time slot and describe your symptoms");
      return;
    }

    setBookingLoading(true);
    try {
      await appointmentsAPI.create({
        doctor_id: selectedDoctor.id,
        slot: bookingData.slot,
        symptoms: bookingData.symptoms,
        notes: bookingData.notes
      });
      setBookingSuccess(true);
      toast.success("Appointment booked successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to book appointment");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
    if (bookingSuccess) {
      navigate("/appointments");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Find a Doctor</h1>
          <p className="text-muted-foreground mt-1">
            Browse our network of qualified healthcare professionals
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-full"
            data-testid="doctor-search-input"
          />
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 skeleton rounded-2xl"></div>
            ))}
          </div>
        ) : filteredDoctors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <Card 
                key={doctor.id} 
                className="doctor-card overflow-hidden"
                data-testid={`doctor-card-${doctor.id}`}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={doctor.image_url}
                    alt={doctor.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-white/90 text-foreground backdrop-blur-sm">
                      <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />
                      {doctor.rating}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg">{doctor.name}</h3>
                  <p className="text-primary text-sm font-medium">{doctor.specialty}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {doctor.experience_years} years
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {doctor.available_slots.length} slots
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 rounded-full"
                    onClick={() => handleBookClick(doctor)}
                    data-testid={`book-doctor-${doctor.id}`}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No doctors found matching your search</p>
          </div>
        )}
      </main>

      {/* Booking Dialog */}
      <Dialog open={bookingOpen} onOpenChange={handleCloseBooking}>
        <DialogContent className="sm:max-w-md">
          {bookingSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <DialogTitle className="text-xl mb-2">Appointment Booked!</DialogTitle>
              <DialogDescription>
                Your appointment with {selectedDoctor?.name} has been confirmed for {bookingData.slot}.
              </DialogDescription>
              <Button 
                className="mt-6 rounded-full"
                onClick={handleCloseBooking}
                data-testid="booking-success-close-btn"
              >
                View My Appointments
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Book Appointment</DialogTitle>
                <DialogDescription>
                  Schedule a visit with {selectedDoctor?.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Time Slot</Label>
                  <Select 
                    value={bookingData.slot}
                    onValueChange={(value) => setBookingData(prev => ({ ...prev, slot: value }))}
                  >
                    <SelectTrigger data-testid="booking-slot-select">
                      <SelectValue placeholder="Choose a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDoctor?.available_slots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptoms">Describe Your Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    placeholder="What brings you in today?"
                    value={bookingData.symptoms}
                    onChange={(e) => setBookingData(prev => ({ ...prev, symptoms: e.target.value }))}
                    className="min-h-[100px]"
                    data-testid="booking-symptoms-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Any other information"
                    value={bookingData.notes}
                    onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                    data-testid="booking-notes-input"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBookAppointment}
                  disabled={bookingLoading}
                  data-testid="booking-confirm-btn"
                >
                  {bookingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorsPage;
