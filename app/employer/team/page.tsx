import { getTeamData } from "../actions";
import { TeamManager } from "./team-manager";

export default async function EmployerTeamPage() {
  const data = await getTeamData();
  const seatLabel = data.seatLimit === null ? "Unlimited" : `${data.usedSeats} / ${data.seatLimit}`;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage who can post jobs and review applicants.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Seats used
          </span>
          <span className="font-display text-2xl font-semibold text-pine">{seatLabel}</span>
        </div>
      </div>

      <TeamManager data={data} />
    </div>
  );
}
