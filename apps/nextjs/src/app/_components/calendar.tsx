"use client";

import { useEffect, useState } from "react";

import { RouterOutputs } from "@acme/api";
import { Button } from "@acme/ui/button";

import { api } from "~/trpc/react";
import { useSelectedFriendsStore } from "./friends";

const MS_DAY = 1000 * 60 * 60 * 24;

/**
 * Return the last Sunday of the given date
 * @param from
 */
function getLastSunday(from: Date): Date {
  const day = from.getDay();
  const date = new Date(from.getTime() + -day * MS_DAY);
  date.setHours(0, 0, 0, 0);
  return date;
}

type Cal = RouterOutputs["service"]["getEvents"][number];

type FreeTime = { start: Date; end: Date };

export default function Calendar() {
  const [start, setStart] = useState(getLastSunday(new Date()));
  const { selected } = useSelectedFriendsStore();
  const { data: friendEvents } = api.service.getEventsByFriend.useQuery(
    {
      start,
      userId: [...selected][0] || "",
    },
    {
      enabled: selected.size > 0,
    },
  );

  const [now, setNow] = useState(new Date());

  const { data: me } = api.service.getEvents.useQuery({
    start,
  });

  //   if (!data) return <div>Loading</div>;

  const events =
    me?.reduce(
      (acc, cur) => [
        ...acc,
        ...cur.events.map((e) => ({ ...e, calendar: cur })),
      ],
      [] as (Cal["events"][number] & {
        calendar: { name: string; color: string };
      })[],
    ) || [];

  console.log("events", events);

  function dayEvents(date: Date) {
    const start = date;
    const end = new Date(date.getTime() + MS_DAY);
    const filtered = events.filter((e) => e.start >= start && e.end <= end);

    return filtered;
  }

  function dayFreeTime(date: Date): FreeTime[] {
    if (!me) return [];
    if (!friendEvents) return [];

    const freeTimes: FreeTime[] = [];

    const allEvents = [
      ...me.flatMap((cal) => cal.events),
      ...friendEvents.flatMap((cal) => cal.events),
    ]
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .filter((e) => e.start.toDateString() == date.toDateString());

    if (allEvents.length === 0) {
      return [
        {
          start: new Date(date.setHours(0, 0, 0, 0)),
          end: new Date(date.setHours(23, 59, 59, 999)),
        },
      ];
    }

    let currentTime = new Date(date.setHours(0, 0, 0, 0));
    let latestEndTime = currentTime;

    for (const event of allEvents) {
      if (currentTime < event.start) {
        freeTimes.push({
          start: new Date(currentTime),
          end: new Date(event.start),
        });
      }
      latestEndTime = event.end > latestEndTime ? event.end : latestEndTime;
      currentTime = latestEndTime;
    }

    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    if (currentTime < endOfDay) {
      freeTimes.push({
        start: new Date(currentTime),
        end: endOfDay,
      });
    }
    return freeTimes.filter(
      (ft) => (ft.end.getTime() - ft.start.getTime()) / (1000 * 60) >= 60,
    );
  }

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000 * 60);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="flex w-full flex-row">
      <div className="relative flex w-full flex-row">
        <div className="absolute z-10 w-full border-b bg-background">
          <div className="flex flex-row items-center justify-between px-4 pt-4">
            <div>
              <span className="font-bold">
                {now.toLocaleString("default", { month: "long" })}{" "}
              </span>
              {now.getFullYear()}
            </div>
            <div>
              <Button
                onClick={() =>
                  setStart((s) => new Date(s.getTime() - MS_DAY * 7))
                }
                variant="ghost"
              >
                ←
              </Button>
              <Button
                onClick={() => setStart((s) => getLastSunday(new Date()))}
                variant="ghost"
              >
                Today
              </Button>
              <Button
                onClick={() =>
                  setStart((s) => new Date(s.getTime() + MS_DAY * 7))
                }
                variant="ghost"
              >
                →
              </Button>
            </div>
          </div>
          <div className="flex w-full flex-row">
            <div className="w-12" />
            <div className="flex w-full flex-row py-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(start.getTime() + i * MS_DAY);

                return (
                  <div className="relative w-full text-center" key={i}>
                    {
                      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                        d.getDay()
                      ]
                    }{" "}
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-row">
          <div className="w-12 overflow-hidden">
            {Array.from({ length: 23 }).map((_, j) => (
              <div
                style={{ height: "calc(100vh / 24)" }}
                className="pr-2 pt-6 text-right text-sm"
                key={j}
              >
                <span className="pr-1 font-semibold text-muted-foreground">
                  {j > 11 ? j - 11 : j + 1}
                </span>
                <span className="text-[8px] font-semibold text-muted-foreground">
                  {j > 10 ? "PM" : "AM"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex w-full flex-row">
            {Array.from({ length: 7 }).map((_, i) => (
              <div className="relative w-full" key={i}>
                <div className="inset-right-0 absolute inset-0">
                  {dayEvents(new Date(start.getTime() + MS_DAY * i)).map(
                    (e) => (
                      <div
                        style={{
                          top: `calc(100vh * ${(e.start.getHours() * 60 + e.start.getMinutes()) / (60 * 24)})`,
                          height: `calc(100vh * ${(e.end.getTime() - e.start.getTime()) / (1000 * 60 * 60 * 24)})`,
                          borderColor: e.calendar.color,
                        }}
                        className="absolute w-full border-l bg-secondary pl-2"
                      >
                        <span className="text-xs">{e.name}</span>
                      </div>
                    ),
                  )}
                </div>

                {i == now.getDay() && (
                  <>
                    <div
                      style={{
                        top: `calc(100vh * ${(now.getHours() * 60 + now.getMinutes()) / (60 * 24)})`,
                      }}
                      className="absolute z-20 h-1 w-full bg-red-600 blur"
                    />
                    <div
                      style={{
                        top: `calc(100vh * ${(now.getHours() * 60 + now.getMinutes()) / (60 * 24)})`,
                      }}
                      className="absolute z-20 h-1 w-full rounded-full bg-red-600"
                    />
                  </>
                )}

                {dayFreeTime(new Date(start.getTime() + MS_DAY * i)).map(
                  (e) => (
                    <>
                      <div
                        style={{
                          top: `calc(100vh * ${(e.start.getHours() * 60 + e.start.getMinutes()) / (60 * 24)})`,
                          height: `calc(100vh * ${(e.end.getTime() - e.start.getTime()) / (1000 * 60 * 60 * 24)})`,
                        }}
                        className="absolute left-1 w-1 rounded-full bg-green-400"
                      />
                      <div
                        style={{
                          top: `calc(100vh * ${(e.start.getHours() * 60 + e.start.getMinutes()) / (60 * 24)})`,
                          height: `calc(100vh * ${(e.end.getTime() - e.start.getTime()) / (1000 * 60 * 60 * 24)})`,
                        }}
                        className="absolute left-1 w-1 rounded-full bg-green-400 blur"
                      />
                    </>
                  ),
                )}

                {Array.from({ length: 24 }).map((_, j) => (
                  <div
                    style={{ height: "calc(100vh / 24)" }}
                    className="border-b border-r"
                    key={j}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
