"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plane, Building2, Clock, SlidersHorizontal } from "lucide-react";

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
    <>
      {/* Desktop Inline Filters */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
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

      {/* Mobile Filters Sheet */}
      <div className="sm:hidden w-full">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full h-12 border-navy-700 bg-navy-800 text-sm gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[auto] max-h-[90vh] border-t border-navy-700 bg-navy-900 rounded-t-2xl p-6">
            <SheetHeader className="mb-6 border-b border-navy-800 pb-4 p-0">
              <SheetTitle className="text-white text-lg font-semibold">Filters</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Plane className="h-3.5 w-3.5" /> Stops
                </label>
                <Select value={stopsFilter} onValueChange={setStopsFilter}>
                  <SelectTrigger className="h-12 w-full border-navy-700 bg-navy-800 text-sm">
                    <SelectValue placeholder="Stops" />
                  </SelectTrigger>
                  <SelectContent className="border-navy-700 bg-navy-800">
                    <SelectItem value="any">Any stops</SelectItem>
                    <SelectItem value="0">Direct</SelectItem>
                    <SelectItem value="1">1 stop</SelectItem>
                    <SelectItem value="2+">2+ stops</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Airlines
                </label>
                <Select value={airlineFilter} onValueChange={setAirlineFilter}>
                  <SelectTrigger className="h-12 w-full border-navy-700 bg-navy-800 text-sm">
                    <SelectValue placeholder="Airlines" />
                  </SelectTrigger>
                  <SelectContent className="border-navy-700 bg-navy-800">
                    <SelectItem value="all">All Airlines</SelectItem>
                    {airlines.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Departure Time
                </label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="h-12 w-full border-navy-700 bg-navy-800 text-sm">
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
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
