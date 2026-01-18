'use client';

import { SchoolManagement } from './school-management';
import { StudentManagement } from './student-management';
import { BusManagement } from './bus-management';

export default function DashboardDemo() {
  return (
    <div
      className={
        'animate-in fade-in flex flex-col space-y-4 pb-36 duration-500'
      }
    >
      <SchoolManagement />

      <StudentManagement />

      <BusManagement />
    </div>
  );
}
