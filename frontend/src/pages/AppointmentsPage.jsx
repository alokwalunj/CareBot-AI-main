import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  Clock, 
  User, 
  FileText,
  X,
  Plus,
  Stethoscope
} from "lucide-react";
import { appointmentsAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await appointmentsAPI.getAll();
      setAppointments(res.data);
    } catch (error) {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      await appointmentsAPI.cancel(id);
      setAppointments(prev => 
        prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a)
      );
      toast.success("Appointment cancelled");
    } catch (error) {
      toast.error("Failed to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  const scheduledAppointments = appointments.filter(a => a.status === "scheduled");
  const pastAppointments = appointments.filter(a => a.status !== "scheduled");

  const getStatusBadge = (status) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-primary/10 text-primary">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const AppointmentCard = ({ appointment, showCancel = false }) => (
    <Card className="overflow-hidden" data-testid={`appointment-card-${appointment.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{appointment.doctor_name}</h3>
              {getStatusBadge(appointment.status)}
            </div>
            <p className="text-sm text-primary font-medium">{appointment.doctor_specialty}</p>
            
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{appointment.slot}</span>
              </div>
              
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{appointment.symptoms}</span>
              </div>
              
              {appointment.notes && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Stethoscope className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{appointment.notes}</span>
                </div>
              )}
            </div>
          </div>
          
          {showCancel && appointment.status === "scheduled" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive"
                  data-testid={`cancel-appointment-${appointment.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel your appointment with {appointment.doctor_name} on {appointment.slot}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleCancel(appointment.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid={`confirm-cancel-${appointment.id}`}
                  >
                    Cancel Appointment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          Booked on {format(new Date(appointment.created_at), "MMM d, yyyy 'at' h:mm a")}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
            <p className="text-muted-foreground mt-1">
              Manage your scheduled and past appointments
            </p>
          </div>
          <Link to="/doctors">
            <Button className="rounded-full" data-testid="book-new-appointment-btn">
              <Plus className="w-4 h-4 mr-2" />
              Book New
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 skeleton rounded-2xl"></div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No appointments yet</h3>
              <p className="text-muted-foreground mb-6">
                Book your first appointment with one of our qualified doctors
              </p>
              <Link to="/doctors">
                <Button className="rounded-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Find a Doctor
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="bg-secondary/50 p-1 rounded-full">
              <TabsTrigger 
                value="upcoming" 
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="upcoming-tab"
              >
                Upcoming ({scheduledAppointments.length})
              </TabsTrigger>
              <TabsTrigger 
                value="past" 
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="past-tab"
              >
                Past ({pastAppointments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="space-y-4">
              {scheduledAppointments.length > 0 ? (
                scheduledAppointments.map(appointment => (
                  <AppointmentCard 
                    key={appointment.id} 
                    appointment={appointment} 
                    showCancel 
                  />
                ))
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <p className="text-muted-foreground">No upcoming appointments</p>
                    <Link to="/doctors">
                      <Button variant="link" className="mt-2">Book an appointment</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="past" className="space-y-4">
              {pastAppointments.length > 0 ? (
                pastAppointments.map(appointment => (
                  <AppointmentCard 
                    key={appointment.id} 
                    appointment={appointment} 
                  />
                ))
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <p className="text-muted-foreground">No past appointments</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default AppointmentsPage;
