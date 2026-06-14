import CalendarView from '@/components/CalendarView';

export default function Calendar() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mon calendrier</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Vos sessions et réservations.</p>
      </div>
      <CalendarView />
    </div>
  );
}
