import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const buildStructuredPayload = (annotations: Array<{ field_key: string; value: string }>) => {
  const payload: Record<string, any> = {
    patient: {},
    vitals: {},
    labs: [],
    medications: [],
  };

  annotations.forEach((annotation) => {
    switch (annotation.field_key) {
      case 'Patient_Name':
        payload.patient.name = annotation.value;
        break;
      case 'DOB':
        payload.patient.dob = annotation.value;
        break;
      case 'MRN':
        payload.patient.mrn = annotation.value;
        break;
      case 'Blood_Pressure':
        payload.vitals.bp = annotation.value;
        break;
      case 'Heart_Rate':
        payload.vitals.hr = annotation.value;
        break;
      case 'Medication_Name':
        payload.medications.push({ name: annotation.value });
        break;
      case 'Medication_Dose':
        if (payload.medications.length === 0) payload.medications.push({});
        payload.medications[payload.medications.length - 1].dose = annotation.value;
        break;
      case 'Sodium':
      case 'Creatinine':
        payload.labs.push({ test: annotation.field_key, value: annotation.value });
        break;
      default:
        payload[annotation.field_key] = annotation.value;
    }
  });

  return payload;
};

export async function GET(_request: NextRequest, { params }: { params: { documentId: string } }) {
  const supabase = createServerSupabaseClient();
  const documentId = params.documentId;

  const { data: existing } = await supabase
    .from('structured_results')
    .select('*')
    .eq('document_id', documentId)
    .single();

  if (existing) {
    return NextResponse.json({ structured: existing.payload });
  }

  const { data: annotations, error } = await supabase
    .from('annotations')
    .select('field_key,value')
    .eq('document_id', documentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = buildStructuredPayload(annotations || []);
  const { data, error: insertError } = await supabase
    .from('structured_results')
    .insert({ document_id: documentId, payload })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ structured: data?.payload });
}
