import { Route, Switch } from "wouter";
import { SiteNav } from "@/components/site-nav";
import { GamesPage } from "@/features/games/games-page";
import { HunchPage } from "@/features/hunch/hunch-page";
import { LearningPage } from "@/features/learning/learning-page";
import { MePage } from "@/features/me/me-page";
import { RulePage } from "@/features/rule/rule-page";
import { StatusPage } from "@/features/status/status-page";
import { VerifyPage } from "@/features/verify/verify-page";
import { useSessionCheck } from "@/hooks/use-session-check";

export function App() {
  useSessionCheck();
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <Switch>
        <Route path="/" component={HunchPage} />
        <Route path="/games" component={GamesPage} />
        <Route path="/status" component={StatusPage} />
        <Route path="/learning" component={LearningPage} />
        <Route path="/me" component={MePage} />
        <Route path="/r/:id">{(params) => <RulePage id={params.id} />}</Route>
        <Route path="/p/:id">{(params) => <VerifyPage id={params.id} />}</Route>
        <Route>
          <main className="mx-auto max-w-[752px] px-4 pt-[18vh] text-muted-foreground">
            Nothing here. Go back to the hunch.
          </main>
        </Route>
      </Switch>
    </div>
  );
}
