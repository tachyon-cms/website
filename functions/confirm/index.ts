import type { Env } from '../../server/env';
import { confirm, showConfirm } from '../../server/signup';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => showConfirm(request, env);
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => confirm(request, env);
