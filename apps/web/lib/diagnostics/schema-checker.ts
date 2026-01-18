/**
 * Schema Checker - Diagnostic tool
 * Vérifie les colonnes et les relations dans Supabase
 */

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

export async function checkSchema() {
  const supabase = getSupabaseBrowserClient();

  console.group('🔍 SCHEMA DIAGNOSTICS');

  // Test 1: Check missions table
  console.group('📋 Missions Table Columns');
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.error('❌ Table "missions" n\'existe pas');
    } else if (error) {
      console.error('❌ Erreur:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Colonnes trouvées:', Object.keys(data[0]));

      // Check for driver-related columns
      const keys = Object.keys(data[0]);
      const driverColumns = keys.filter(k => k.includes('driver'));
      const userColumns = keys.filter(k => k.includes('user') || k.includes('assigned'));

      if (driverColumns.length > 0) {
        console.log('✅ Colonnes driver found:', driverColumns);
      } else {
        console.warn('⚠️ No driver-related columns found. Possible alternatives:', userColumns);
      }
    }
  } catch (err) {
    console.error('Error checking missions:', err);
  }
  console.groupEnd();

  // Test 2: Check items table
  console.group('📦 Items Table Columns');
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.error('❌ Table "items" n\'existe pas');
    } else if (error) {
      console.error('❌ Erreur:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Colonnes trouvées:', Object.keys(data[0]));

      const keys = Object.keys(data[0]);
      const recipientColumns = keys.filter(k => k.includes('recipient'));
      const clientColumns = keys.filter(k => k.includes('client'));
      const metadataColumns = keys.filter(k => k.includes('metadata'));

      console.log('- Recipient columns:', recipientColumns.length > 0 ? recipientColumns : '(none)');
      console.log('- Client columns:', clientColumns.length > 0 ? clientColumns : '(none)');
      console.log('- Metadata columns:', metadataColumns.length > 0 ? metadataColumns : '(none)');
    }
  } catch (err) {
    console.error('Error checking items:', err);
  }
  console.groupEnd();

  // Test 3: Check user_profiles table
  console.group('👤 User Profiles Table Columns');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.error('❌ Table "user_profiles" n\'existe pas');
    } else if (error) {
      console.error('❌ Erreur:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Colonnes trouvées:', Object.keys(data[0]));
    }
  } catch (err) {
    console.error('Error checking user_profiles:', err);
  }
  console.groupEnd();

  // Test 4: Check organization_members table
  console.group('🏢 Organization Members Table Columns');
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.error('❌ Table "organization_members" n\'existe pas');
    } else if (error) {
      console.error('❌ Erreur:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Colonnes trouvées:', Object.keys(data[0]));
    }
  } catch (err) {
    console.error('Error checking organization_members:', err);
  }
  console.groupEnd();

  // Test 5: Check invitations table
  console.group('📧 Invitations Table Columns');
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.error('❌ Table "invitations" n\'existe pas');
    } else if (error) {
      console.error('❌ Erreur:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Colonnes trouvées:', Object.keys(data[0]));
    }
  } catch (err) {
    console.error('Error checking invitations:', err);
  }
  console.groupEnd();

  console.groupEnd();
}

// Usage in any component:
// useEffect(() => {
//   if (process.env.NODE_ENV === 'development') {
//     checkSchema();
//   }
// }, []);
