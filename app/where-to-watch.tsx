import type {WatchAvailability} from '../lib/watch-availability';
import WatchIcons from './watch-icons';
export default function WhereToWatch({availability,loading=false,compact=false}:{availability?:WatchAvailability;compact?:boolean;loading?:boolean}){return <><WatchIcons availability={availability&&!compact?{...availability,cinema:undefined}:availability} loading={loading} linked={!compact}/>{!compact&&<p className="sr-only">Disponibilidade: JustWatch via TMDB.</p>}</>;}
