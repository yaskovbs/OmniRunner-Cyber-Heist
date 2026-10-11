import { useMutation, useQuery } from '@tanstack/react-query';
import { answerQuestion, fetchLeaderboard, requestWithdrawal, startHeist, submitHeist, submitStepBucket } from '@/server/mockServer';
import type { HeistSubmission } from '@/shared/verify';
import type { TriviaAnswer } from '@/shared/triviaGuard';

export const useStartHeist = () => useMutation({ mutationFn: startHeist });

export const useAnswer = () =>
  useMutation({ mutationFn: (v: { sessionId: string; answer: TriviaAnswer }) => answerQuestion(v.sessionId, v.answer) });

export const useSubmitHeist = () =>
  useMutation({ mutationFn: (v: { sub: HeistSubmission; gearBonus: number }) => submitHeist(v.sub, v.gearBonus) });

export const useLeaderboard = (myBest: number) =>
  useQuery({ queryKey: ['leaderboard', myBest], queryFn: () => fetchLeaderboard(myBest), staleTime: 30_000 });

export { submitStepBucket, requestWithdrawal };
