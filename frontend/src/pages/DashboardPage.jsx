import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Plus,
  Stethoscope,
  Activity,
  AlertCircle
} from "lucide-react";
import { chatAPI, appointmentsAPI } from "@/lib/api";
import { useAuth } from "@/App";
import { format } from "date-fns";

const DashboardPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, appointmentsRes] = await Promise.all([
          chatAPI.getSessions(),
          appointmentsAPI.getAll()
        ]);
        setSessions(sessionsRes.data.slice(0, 3));
        setAppointments(appointmentsRes.data.filter(a => a.status === "scheduled").slice(0, 3));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      title: "Chat Sessions",
      value: sessions.length,
      icon: MessageCircle,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Appointments",
      value: appointments.length,
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-100"
    },
    {
      title: "Health Status",
      value: "Good",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-100"
    }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="patient-dashboard">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your health journey
          </p>
        </div>

        {/* Quick Action */}
        <Card className="mb-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 overflow-hidden">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Need health guidance?</h3>
                <p className="text-primary-foreground/80 text-sm">
                  Start a conversation with CareBot for instant support
                </p>
              </div>
            </div>
            <Link to="/chat">
              <Button variant="secondary" className="rounded-full" data-testid="dashboard-start-chat-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Consultation
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="stat-card" data-testid={`stat-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Conversations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent Conversations</CardTitle>
                <CardDescription>Your latest chat sessions with CareBot</CardDescription>
              </div>
              <Link to="/chat">
                <Button variant="ghost" size="sm" className="text-primary" data-testid="view-all-chats-btn">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 skeleton rounded-xl"></div>
                  ))}
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Link 
                      key={session.id} 
                      to={`/chat/${session.id}`}
                      className="block p-4 rounded-xl border border-border/50 hover:bg-accent transition-colors"
                      data-testid={`chat-session-${session.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{session.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.last_message_at), "MMM d, h:mm a")}
                          </div>
                        </div>
                        <MessageCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <Link to="/chat">
                    <Button variant="link" className="mt-2">Start your first chat</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                <CardDescription>Your scheduled doctor visits</CardDescription>
              </div>
              <Link to="/appointments">
                <Button variant="ghost" size="sm" className="text-primary" data-testid="view-all-appointments-btn">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 skeleton rounded-xl"></div>
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-4 rounded-xl border border-border/50"
                      data-testid={`appointment-${appointment.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium">{appointment.doctor_name}</p>
                          <p className="text-sm text-muted-foreground">{appointment.doctor_specialty}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {appointment.slot}
                            </Badge>
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                          Scheduled
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No upcoming appointments</p>
                  <Link to="/doctors">
                    <Button variant="link" className="mt-2">Book an appointment</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Health Tip */}
        <Card className="mt-6 bg-secondary/30 border-secondary">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h4 className="font-medium mb-1">Health Tip of the Day</h4>
              <p className="text-sm text-muted-foreground">
                Remember to stay hydrated! Drinking 8 glasses of water daily helps maintain energy levels, 
                supports digestion, and keeps your skin healthy.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DashboardPage;
