import React from 'react';

export default function Timeline({ events = [] }) {
  return (
    <div className="space-y-4">
      {events.map((event, idx) => (
        <div key={idx} className="flex gap-4 items-start">
          <div className="w-3 h-3 rounded-full bg-indigo-500 mt-1" />
          <div>
            <p className="font-semibold text-white">{event.title}</p>
            <p className="text-sm text-gray-400">{event.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
