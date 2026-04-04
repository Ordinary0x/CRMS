import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function StaffNotifications() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey() }
  });
  const items = notifications || [];

  const markRead = useMarkNotificationRead();

  const handleMarkAllRead = () => {
    const unread = items.filter((item) => !item.read_at);
    if (unread.length === 0) {
      toast.info("No unread notifications");
      return;
    }

    Promise.all(unread.map((item) => markRead.mutateAsync({ id: item.notification_id })))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
        toast.success("All marked as read");
      })
      .catch(() => {
        toast.error("Failed to mark all as read");
      });
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Notifications</h2>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark all read
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
          ) : items.length > 0 ? (
            items.map(notification => (
              <div 
                key={notification.notification_id} 
                className={`p-6 flex gap-4 transition-colors ${!notification.read_at ? 'bg-primary/5' : ''}`}
              >
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.read_at ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      {notification.channel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <p className={`text-base ${!notification.read_at ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {notification.message}
                  </p>
                  {!notification.read_at && (
                    <Button variant="link" size="sm" className="px-0 h-auto mt-2 text-primary" onClick={() => handleMarkRead(notification.notification_id)}>
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">All caught up</h3>
              <p className="text-sm text-muted-foreground mt-1">You don't have any notifications at the moment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
