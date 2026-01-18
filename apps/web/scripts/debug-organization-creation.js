/**
 * Script de débogage pour vérifier la création d'organisation
 * Exécuter avec: node scripts/debug-organization-creation.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrganizationCreation() {
  console.log('🔍 Débogage de la création d\'organisation...\n');

  // 1. Vérifier les organisations existantes
  console.log('1️⃣ Organisations existantes:');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, slug, owner_id, created_at');

  if (orgsError) {
    console.error('❌ Erreur:', orgsError);
  } else {
    console.log(`   Nombre: ${orgs?.length || 0}`);
    orgs?.forEach(org => {
      console.log(`   - ${org.name} (${org.slug}) - Owner: ${org.owner_id}`);
    });
  }

  console.log('\n2️⃣ Memberships (organization_members):');
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, approved, joined_at, created_at');

  if (membersError) {
    console.error('❌ Erreur:', membersError);
  } else {
    console.log(`   Nombre: ${members?.length || 0}`);
    members?.forEach(member => {
      console.log(`   - Org: ${member.organization_id.substring(0, 8)}... User: ${member.user_id.substring(0, 8)}... Role: ${member.role} Approved: ${member.approved}`);
    });
  }

  // 3. Vérifier les triggers
  console.log('\n3️⃣ Vérification du trigger:');
  const { data: triggers, error: triggersError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          trigger_name,
          event_manipulation,
          event_object_table,
          action_statement
        FROM information_schema.triggers
        WHERE trigger_name = 'on_organization_created';
      `
    })
    .catch(() => {
      // Fallback si rpc n'existe pas
      return { data: null, error: 'RPC non disponible' };
    });

  if (triggers?.data) {
    console.log('   Trigger trouvé:', triggers.data);
  } else {
    console.log('   ⚠️ Impossible de vérifier le trigger via RPC');
  }

  // 4. Simulation: vérifier ce qui se passerait
  console.log('\n4️⃣ Test de la requête getCurrentOrganization:');

  // Récupérer le premier utilisateur
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    console.log(`   User ID: ${user.id}`);

    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        approved,
        organizations (
          id,
          name,
          slug,
          domain_type
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (membershipError) {
      console.error('   ❌ Erreur membership:', membershipError.message);
      console.log('   Code:', membershipError.code);
    } else if (!membership) {
      console.log('   ⚠️ Aucun membership trouvé');
    } else {
      console.log('   ✅ Membership trouvé:');
      console.log('      - Org ID:', membership.organization_id);
      console.log('      - Role:', membership.role);
      console.log('      - Approved:', membership.approved);
      console.log('      - Org Name:', membership.organizations?.name);
    }
  } else {
    console.log('   ⚠️ Aucun utilisateur connecté');
  }

  console.log('\n✅ Débogage terminé\n');
}

debugOrganizationCreation().catch(console.error);
