// Practice runs in this web view only. It uses the ranked puzzle rules but no
// persistence or write endpoint, leaving the archived round untouched.
import {navigateTo} from '@devvit/web/client';
import {newPlayer,takeAction} from './round.cjs';
import {trace} from '../pilot/boards.cjs';

export {navigateTo,newPlayer,takeAction,trace};
