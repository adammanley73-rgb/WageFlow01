import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

// Define types for better type safety
interface CompanyAddress {
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
}

interface CompanySettings {
  companyName: string;
  companyNumber: string;
  payeReference: string;
  accountsOfficeReference: string;
  address: CompanyAddress;
  contactEmail: string;
  contactPhone: string;
}

interface DatabaseCompanySettings {
  company_name: string | null;
  company_number: string | null;
  paye_reference: string | null;
  accounts_office_reference: string | null;
  address: CompanyAddress | null;
  contact_email: string | null;
  contact_phone: string | null;
  updated_at?: string;
}

// GET /api/settings/company - Get company settings
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for empty table
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
    
    // Return default settings if none exist or error occurred
    const defaultSettings: CompanySettings = {
      companyName: '',
      companyNumber: '',
      payeReference: '',
      accountsOfficeReference: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        county: '',
        postcode: '',
      },
      contactEmail: '',
      contactPhone: '',
    };
    
    if (!data) {
      return NextResponse.json(defaultSettings);
    }
    
    // Transform database format to frontend format
    const settings: CompanySettings = {
      companyName: data.company_name || '',
      companyNumber: data.company_number || '',
      payeReference: data.paye_reference || '',
      accountsOfficeReference: data.accounts_office_reference || '',
      address: data.address || defaultSettings.address,
      contactEmail: data.contact_email || '',
      contactPhone: data.contact_phone || '',
    };
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST /api/settings/company - Save company settings
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: CompanySettings = await request.json();
    
    // Validate required fields
    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    
    if (!body.payeReference?.trim()) {
      return NextResponse.json({ error: 'PAYE reference is required' }, { status: 400 });
    }
    
    if (!body.accountsOfficeReference?.trim()) {
      return NextResponse.json({ error: 'Accounts Office reference is required' }, { status: 400 });
    }
    
    // Validate PAYE reference format
    const payeRegex = /^\d{3}\/[A-Z]{2}\d{5}$/;
    if (!payeRegex.test(body.payeReference)) {
      return NextResponse.json({ error: 'PAYE reference must be in format: 123/AB12345' }, { status: 400 });
    }
    
    // Validate Accounts Office reference format
    const accountsOfficeRegex = /^\d{3}P[A-Z]{8}\d{5}$/;
    if (!accountsOfficeRegex.test(body.accountsOfficeReference)) {
      return NextResponse.json({ error: 'Accounts Office reference must be in format: 123PABCDEFGH12345' }, { status: 400 });
    }
    
    // Validate email if provided
    if (body.contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.contactEmail)) {
        return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
      }
    }
    
    const settingsData: DatabaseCompanySettings = {
      company_name: body.companyName.trim(),
      company_number: body.companyNumber?.trim() || null,
      paye_reference: body.payeReference.trim(),
      accounts_office_reference: body.accountsOfficeReference.trim(),
      address: body.address,
      contact_email: body.contactEmail?.trim() || null,
      contact_phone: body.contactPhone?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    
    // Use upsert to insert or update
    const { data, error } = await supabase
      .from('company_settings')
      .upsert(settingsData, {
        onConflict: 'id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: error.message || 'Failed to save settings' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving company settings:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}