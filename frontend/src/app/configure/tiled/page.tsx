import { redirect } from 'next/navigation';

// Single magnets and tiled sets are now both made in the one studio at /configure.
export default function LegacyConfigureRedirect() {
  redirect('/configure');
}
