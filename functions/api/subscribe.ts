import type { Env } from '../../server/env';
import { subscribe } from '../../server/signup';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => subscribe(request, env);
