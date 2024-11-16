import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { FormattedMessage, useIntl } from "react-intl";
import { PositionDisplay } from "./ScoreOverview";
import { PasscodeDisplayCard } from "../cards/PassCodeDisplayCard";
import { Button } from "../components/Button";
import toast from "react-hot-toast";

interface TeamStatusResponse {
  name: string;
  score: string;
  position: number;
  totalTeams: number;
  solvedChallenges: number;
  readiness: boolean;
}

function LogoutButton({
  setActiveTeam,
}: {
  setActiveTeam: (team: string | null) => void;
}) {
  const navigate = useNavigate();
  const intl = useIntl();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    const confirmed = confirm(
      intl.formatMessage({
        id: "logout_confirmation",
        defaultMessage:
          "Are you sure you want to logout? If you don't have the passcode saved, you won't be able to rejoin.",
      })
    );
    if (!confirmed) {
      return;
    }
    try {
      setActiveTeam(null);
      setIsLoggingOut(true);
      await fetch("/balancer/api/teams/logout", {
        method: "POST",
      });
      setIsLoggingOut(false);
      toast.success(
        intl.formatMessage({
          id: "logout_success",
          defaultMessage: "Logged out successfully",
        })
      );
      navigate("/");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <button
      disabled={isLoggingOut}
      onClick={logout}
      className="bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
    >
      <FormattedMessage id="log_out" defaultMessage="Log Out" />
    </button>
  );
}

const PasscodeResetButton = ({ team }: { team: string }) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [isResetting, setIsResetting] = useState(false);

  async function resetPasscode() {
    setIsResetting(true);
    try {
      const response = await fetch("/balancer/api/teams/reset-passcode", {
        method: "POST",
      });
      const data = await response.json();
      navigate(`/teams/${team}/status/`, {
        state: { passcode: data.passcode, reset: true },
      });
      toast.success(
        intl.formatMessage({
          id: "passcode_reset_success",
          defaultMessage: "Passcode reset successfully",
        })
      );
    } catch (error) {
      console.error("Failed to reset passcode", error);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <button
      onClick={resetPasscode}
      disabled={isResetting}
      className="bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
    >
      <FormattedMessage id="reset_passcode" defaultMessage="Reset Passcode" />
    </button>
  );
};

async function fetchTeamStatusData(): Promise<TeamStatusResponse> {
  const response = await fetch(`/balancer/api/teams/status`);
  if (!response.ok) {
    throw new Error("Failed to fetch current teams");
  }
  const status = (await response.json()) as TeamStatusResponse;
  return status;
}

export const TeamStatusPage = ({
  setActiveTeam,
}: {
  setActiveTeam: (team: string | null) => void;
}) => {
  const { team } = useParams();

  const [instanceStatus, setInstanceStatus] =
    useState<TeamStatusResponse | null>(null);

  const { state } = useLocation();

  const passcode: string | null = state?.passcode || null;

  async function updateStatusData() {
    try {
      const status = await fetchTeamStatusData();
      setInstanceStatus(status);
      setActiveTeam(status.name);
    } catch (err) {
      console.error("Failed to fetch current teams!", err);
    }
  }

  useEffect(() => {
    updateStatusData();

    const interval = setInterval(updateStatusData, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [team]);

  if (!team) {
    return <div>Team not found</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <div className="grid grid-cols-2 items-center">
        <div className="flex flex-row items-center p-4">
          <img
            src="/balancer/icons/astronaut.svg"
            alt="Astronaut"
            className="h-12 w-12 shrink-0 mr-3"
          />

          <div className="text-sm font-light">
            <p>
              <FormattedMessage
                id="logged_in_as"
                defaultMessage="Logged in as"
              />
            </p>
            <p>
              <strong className="font-medium">{team}</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-row-reverse items-center p-4 gap-3">
          <LogoutButton setActiveTeam={setActiveTeam} />
          <PasscodeResetButton team={team} />
        </div>
      </div>

      <hr className="border-gray-500" />

      <ScoreDisplay instanceStatus={instanceStatus} />
      <hr className="border-gray-500" />

      {passcode && (
        <>
          <div className="flex flex-col justify-start p-4">
            <PasscodeDisplayCard passcode={passcode} />
          </div>
          <hr className="border-gray-500" />
        </>
      )}

      <StatusDisplay instanceStatus={instanceStatus} />
    </Card>
  );
};

function ScoreDisplay({
  instanceStatus,
}: {
  instanceStatus: TeamStatusResponse | null;
}) {
  if (!instanceStatus?.position || instanceStatus?.position === -1) {
    return (
      <div className="p-4 text-sm">
        <FormattedMessage
          id="updating_score"
          defaultMessage="Your score is getting calculated..."
          values={{
            position: instanceStatus?.position,
            totalTeams: instanceStatus?.totalTeams,
            solvedChallengeCount: instanceStatus?.solvedChallenges,
          }}
        />
      </div>
    );
  }
  return (
    <div className="grid md:grid-cols-[auto_max-content] grid-cols-1 items-center">
      <div className="flex flex-row items-center p-4">
        <div className="h-12 w-12 mr-3 flex shrink-0 items-center justify-center">
          <PositionDisplay place={instanceStatus?.position || -1} />
        </div>
        <span className="text-sm font-light">
          <FormattedMessage
            id="joining_team"
            defaultMessage="You're in the {position}/{totalTeams} place with {solvedChallengeCount} solved challenges"
            values={{
              position: instanceStatus?.position,
              totalTeams: instanceStatus?.totalTeams,
              solvedChallengeCount: instanceStatus?.solvedChallenges,
            }}
          />
        </span>
      </div>
      <div className="flex flex-row-reverse items-center p-4">
        <Link
          to="/score-overview"
          className="bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
        >
          Score Overview →
        </Link>
      </div>
    </div>
  );
}

function StatusDisplay({
  instanceStatus,
}: {
  instanceStatus: TeamStatusResponse | null;
}) {
  if (!instanceStatus?.readiness) {
    return (
      <div className="p-6">
        <Button disabled>
          <FormattedMessage
            id="instance_status_starting"
            defaultMessage="JuiceShop instance is starting..."
          />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button as="a" href="/" target="_blank">
        <FormattedMessage
          id="instance_status_start_hacking"
          defaultMessage="Start Hacking!"
        />
      </Button>
    </div>
  );
}
