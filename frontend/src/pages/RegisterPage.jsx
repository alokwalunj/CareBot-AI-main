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

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    age: "",
    existing_conditions: "", // keep as string in UI
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
      // ✅ SAFE: ensure we never call split on undefined
      const conditionsStr = (formData.existing_conditions ?? "").toString();

      // ✅ Map UI fields -> backend fields
      const payload = {
        fullName: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        age: formData.age ? Number(formData.age) : null,
        conditions: conditionsStr
          ? conditionsStr
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
      };

      const response = await authAPI.register(payload);

      // ✅ backend returns token (not access_token)
      const token = response.data.token;
      const user = response.data.user;

      login(user, token);
      toast.success("Welcome to CareBot!");
      navigate("/dashboard");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Registration failed. Please try again.";
      toast.error(msg);
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
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 w-fit"
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
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>
                Start your health journey with CareBot today
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>

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
                    minLength={6}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (optional)</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      placeholder="25"
                      value={formData.age}
                      onChange={handleChange}
                      min={1}
                      max={120}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="existing_conditions">
                    Existing Conditions (optional)
                  </Label>
                  <Input
                    id="existing_conditions"
                    name="existing_conditions"
                    type="text"
                    placeholder="e.g., Diabetes, Hypertension"
                    value={formData.existing_conditions}
                    onChange={handleChange}
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple conditions with commas
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-full text-base mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Side */}
      <div className="hidden lg:block relative bg-secondary">
        <img
          src="https://images.pexels.com/photos/8376277/pexels-photo-8376277.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Doctor consultation"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="text-2xl font-semibold leading-relaxed">
            "Finally, a healthcare assistant that actually listens and helps me
            make informed decisions."
          </p>
          <p className="mt-4 text-white/80">— Michael K., Patient</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
