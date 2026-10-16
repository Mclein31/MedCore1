import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getFacilityName } from '../lib/facility';
export function useFacilityName() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.facilityName || 'Your hospital');
  useEffect(() => {
    let active = true;
    getFacilityName().then((value) => {
      if (active && value !== 'Your hospital') setName(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return name;
}
