"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Building2, Clock } from "lucide-react";

interface ResultsFilterProps {
  stopsFilter: string;
  setStopsFilter: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  airlineFilter: string;
  setAirlineFilter: (v: string) => void;
  airlines: string[];
  timeFilter: string;
  setTimeFilter: (v: string) => void;
}

export function ResultsFilter({
  stopsFilter, setStopsFilter,
  sortBy, setSortBy,
  airlineFilter, setAirlineFilter,
  airlines,
  timeFilter, setTimeFilter,
}: ResultsFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={stopsFilter} onValueChange={setStopsFilter}>
        <SelectTrigger className="h-8 w-[130px] border-navy-700 bg-navy-800 text-xs">
          <Plane className="mr-1 h-3.5 w-3.5" />
          <SelectValue placeholder="Stops" />
        </SelectTrigger>
        <SelectContent className="border-navy-700 bg-navy-800">
          <SelectItem value="any">Any stops</SelectItem>
          <SelectItem value="0">Direct</SelectItem>
          <SelectItem value="1">1 stop</SelectItem>
          <SelectItem value="2+">2+ stops</SelectItem>
        </SelectContent>
      </Select>

      <Select value={airlineFilter} onValueChange={setAirlineFilter}>
        <SelectTrigger className="h-8 w-[140px] border-navy-700 bg-navy-800 text-xs">
          <Building2 className="mr-1 h-3.5 w-3.5" />
          <SelectValue placeholder="Airlines" />
        </SelectTrigger>
        <SelectContent className="border-navy-700 bg-navy-800">
          <SelectItem value="all">All Airlines</SelectItem>
          {airlines.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={timeFilter} onValueChange={setTimeFilter}>
        <SelectTrigger className="h-8 w-[140px] border-navy-700 bg-navy-800 text-xs">
          <Clock className="mr-1 h-3.5 w-3.5" />
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent className="border-navy-700 bg-navy-800">
          <SelectItem value="any">Any time</SelectItem>
          <SelectItem value="morning">Morning (6am–12pm)</SelectItem>
          <SelectItem value="afternoon">Afternoon (12–6pm)</SelectItem>
          <SelectItem value="evening">Evening (6pm–12am)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
