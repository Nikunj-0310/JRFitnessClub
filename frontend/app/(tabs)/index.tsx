import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // Redirect to dashboard when accessing tabs root
  return <Redirect href="/dashboard" />;
}