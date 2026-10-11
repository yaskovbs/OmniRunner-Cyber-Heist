import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchLeaderboard, startHeist, submitHeist } from './mockServer';
import type { HeistSubmission } from '@/shared/verify';

export const useStartHeist = () => useMutation({ mutationFn: startHeist });

export const useSubmitHeist = () =>
  useMutation({ mutationFn: (v: { sub: HeistSubmission; gearBonus: number }) => submitHeist(v.sub, v.gearBonus) });

export const useLeaderboard = (myBest: number) =>
  useQuery({ queryKey: ['leaderboard', myBest], queryFn: () => fetchLeaderboard(myBest), staleTime: 30_000 });
