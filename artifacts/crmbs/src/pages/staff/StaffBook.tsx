import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocation } from "wouter";
import { useGetResourceAvailability, useGetResource, useCreateBooking, getGetResourceAvailabilityQueryKey, getGetResourceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StaffBook() {
  const { dbUser } = useAuth();
  const [locationStr, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialResourceId = searchParams.get('resource');

  const [step, setStep] = useState(1);
  const [resourceId, setResourceId] = useState<string>(initialResourceId || "");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");

  const { data: resource, isLoading: resLoading } = useGetResource(
    resourceId ? parseInt(resourceId) : 0,
    { query: { enabled: !!resourceId, queryKey: getGetResourceQueryKey(resourceId ? parseInt(resourceId) : 0) } }
  );

  const { data: availability, refetch: checkAvailability, isFetching: checkingAvail } = useGetResourceAvailability(
    resourceId ? parseInt(resourceId) : 0,
    { date: date ? format(date, 'yyyy-MM-dd') : '' },
    { query: { enabled: false, queryKey: getGetResourceAvailabilityQueryKey(resourceId ? parseInt(resourceId) : 0, { date: date ? format(date, 'yyyy-MM-dd') : '' }) } }
  );

  const createBooking = useCreateBooking();

  const formatTime = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = ((h + 11) % 12) + 1;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!resourceId) { toast.error("Please enter a resource ID"); return; }
      if (!date) { toast.error("Please select a date"); return; }
      if (!startTime || !endTime) { toast.error("Please specify start and end times"); return; }
      
      const availResult = await checkAvailability();
      // Assume success for demo if it doesn't throw, ideally we'd validate against `availability` data here.
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleConfirm = async () => {
    try {
      await createBooking.mutateAsync({
        data: {
          resource_id: parseInt(resourceId),
          date: format(date!, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          purpose: purpose || null
        }
      });
      toast.success("Booking submitted successfully!");
      setLocation(`/${dbUser?.role === 'student' ? 'student' : 'staff'}/bookings`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("Time slot conflict detected. Please select an alternative time.");
        // We'd parse alternatives here and show them
      } else {
        toast.error("Failed to submit booking");
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Make a Booking</h2>
          <p className="text-muted-foreground mt-1">Reserve a resource in 3 easy steps.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }} />
        
        {[1, 2, 3].map((num) => (
          <div key={num} className={`flex flex-col items-center justify-center bg-background px-2`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${
              step === num ? 'border-primary bg-primary text-primary-foreground' :
              step > num ? 'border-primary bg-primary/20 text-primary' :
              'border-muted text-muted-foreground bg-muted'
            }`}>
              {step > num ? <CheckCircle2 className="w-6 h-6" /> : num}
            </div>
            <span className={`text-xs mt-2 font-medium ${step >= num ? 'text-primary' : 'text-muted-foreground'}`}>
              {num === 1 ? 'Details' : num === 2 ? 'Availability' : 'Confirm'}
            </span>
          </div>
        ))}
      </div>

      <Card>
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>Select the resource, time, and provide a purpose for your booking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Resource ID</Label>
                <Input 
                  value={resourceId} 
                  onChange={(e) => setResourceId(e.target.value)} 
                  placeholder="Enter resource ID (or select from Search page)" 
                />
                {resource && <p className="text-sm text-green-600 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Found: {resource.resource_name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="time" className="pl-8" value={startTime} onChange={e => setStartTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="time" className="pl-8" value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea 
                  placeholder="Briefly describe the reason for this booking..." 
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
              <Button onClick={handleNextStep} disabled={checkingAvail}>
                {checkingAvail ? "Checking..." : "Check Availability"} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Availability Check</CardTitle>
              <CardDescription>Review the requested time slot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availability?.busy_slots?.some((slot) => slot.start_time < endTime && slot.end_time > startTime) ? (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle>Conflict Detected</AlertTitle>
                  <AlertDescription>
                    The selected slot conflicts with an existing pending/approved request.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Slot Available</AlertTitle>
                  <AlertDescription>
                    The requested time slot ({formatTime(startTime)} - {formatTime(endTime)} on {date && format(date, 'MMM d, yyyy')}) is available for {resource?.resource_name || `Resource #${resourceId}`}.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="bg-muted p-4 rounded-md mt-4">
                <h4 className="font-medium mb-2">Approval Requirements</h4>
                <p className="text-sm text-muted-foreground">
                  {resource?.approval_steps === 2 
                    ? "This resource requires 2-step approval (Resource Manager, then Department Head)." 
                    : resource?.approval_steps === 1 
                      ? "This resource requires 1-step approval (Resource Manager)."
                      : "This resource requires no special approval and will be auto-approved."}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={handleNextStep}
                disabled={Boolean(availability?.busy_slots?.some((slot) => slot.start_time < endTime && slot.end_time > startTime))}
              >
                Review Booking <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Confirm Booking</CardTitle>
              <CardDescription>Final review of your booking details.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground">Resource</dt>
                  <dd className="mt-1 text-sm text-foreground font-semibold">{resource?.resource_name || `Resource #${resourceId}`}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground">Date</dt>
                  <dd className="mt-1 text-sm text-foreground font-semibold">{date && format(date, 'MMMM d, yyyy')}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground">Time</dt>
                  <dd className="mt-1 text-sm text-foreground font-semibold">{formatTime(startTime)} to {formatTime(endTime)}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground">Purpose</dt>
                  <dd className="mt-1 text-sm text-foreground">{purpose || 'N/A'}</dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleConfirm} disabled={createBooking.isPending}>
                {createBooking.isPending ? "Submitting..." : "Submit Booking"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
