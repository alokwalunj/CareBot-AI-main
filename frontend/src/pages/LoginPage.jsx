import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Heart, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "../lib/api";
import { useAuth } from "../App";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const response = await authAPI.login(payload);

      // ✅ backend returns token (not access_token)
      login(response.data.user, response.data.token);

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      // ✅ backend returns message (not detail)
      toast.error(error?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form Side */}
      <div className="flex flex-col justify-center px-8 py-12 lg:px-16">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-12 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CareBot</span>
          </div>

          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to continue your health journey
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-xl"
                    data-testid="login-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-xl"
                    data-testid="login-password-input"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-full text-base"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-primary font-medium hover:underline"
                  data-testid="login-register-link"
                >
                  Create one
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Side */}
      <div className="hidden lg:block relative bg-secondary">
        <img
          src="https://images.pexels.com/photos/7723394/pexels-photo-7723394.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Medical laboratory"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="text-2xl font-semibold leading-relaxed">
            "CareBot helped me understand my symptoms and connected me with the
            right specialist quickly."
          </p>
          <p className="mt-4 text-white/80">— Sarah M., Patient</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
