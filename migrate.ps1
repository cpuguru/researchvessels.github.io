# migrate.ps1
# Converts ship_info.json into individual YAML files under:
#   _data/vessels/       - one .yml file per vessel
#   _data/organizations/ - one .yml file per unique operator/owner
#
# Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File migrate.ps1

$inputFile      = "ship_info.json"
$outputVessels  = "_data/vessels"
$outputOrgs     = "_data/organizations"

New-Item -ItemType Directory -Force -Path $outputVessels  | Out-Null
New-Item -ItemType Directory -Force -Path $outputOrgs     | Out-Null

# ---- Helpers -----------------------------------------------------------------

function Get-Slug {
    param([string]$name)
    $s = $name.ToLower()
    $s = $s -replace '[^a-z0-9\s-]', ''
    $s = $s -replace '\s+', '-'
    $s = $s -replace '-+', '-'
    return $s.Trim('-')
}

function Get-Field {
    param($obj, [string]$field)
    $prop = $obj.PSObject.Properties[$field]
    if ($null -eq $prop -or $null -eq $prop.Value -or "$($prop.Value)".Trim() -eq '') { return $null }
    return "$($prop.Value)".Trim()
}

function Format-Yaml {
    param($value)
    if ($null -eq $value -or "$value".Trim() -eq '') { return '' }
    $s = "$value".Trim()
    if ($s -match '[:#\[\]{}|>&*!,@`]' -or
        $s -match '^\s' -or $s -match '\s$' -or
        $s -match '^(true|false|yes|no|on|off|null|~)$' -or
        $s -match '^\d+:\d') {
        $escaped = $s -replace '"', '\"'
        return "`"$escaped`""
    }
    return $s
}

function Convert-AirCond {
    param($value)
    if ($null -eq $value) { return '' }
    switch ($value) {
        '1'  { return 'true' }
        '0'  { return 'false' }
        '-1' { return '~' }
        default { return '' }
    }
}

function Convert-Bool {
    param($value)
    if ($value -eq '1') { return 'true' }
    return 'false'
}

function Convert-Status {
    param($value)
    if ($value -eq '1') { return 'Out of Service' }
    return 'Active'
}

function Convert-Date {
    param($value)
    if ($null -eq $value) { return '' }
    if ("$value".Length -ge 10) { return "$value".Substring(0,10) }
    return "$value"
}

function Add-Section {
    param($sb, [string]$title)
    $sb.AppendLine("") | Out-Null
    $sb.AppendLine("# -----------------------------------------") | Out-Null
    $sb.AppendLine("# $title") | Out-Null
    $sb.AppendLine("# -----------------------------------------") | Out-Null
}

function Add-Field {
    param($sb, [string]$key, $value, [int]$indent = 0)
    $spaces = ' ' * $indent
    $sb.AppendLine("${spaces}${key}: $(Format-Yaml $value)") | Out-Null
}

# ---- Load JSON ---------------------------------------------------------------

Write-Host "Loading $inputFile ..."
$json    = Get-Content $inputFile -Raw -Encoding UTF8 | ConvertFrom-Json
$vessels = $json.dataroot.ship_info
Write-Host "Found $($vessels.Count) vessel records."

# ---- Pre-scan for duplicate names -------------------------------------------

$slugCount = @{}
foreach ($v in $vessels) {
    $name = Get-Field $v 'shipname'
    if (-not $name) { continue }
    $slug = Get-Slug $name
    if ($slugCount.ContainsKey($slug)) { $slugCount[$slug]++ }
    else { $slugCount[$slug] = 1 }
}

# ---- Process vessels ---------------------------------------------------------

$orgSet = [ordered]@{}
$count  = 0

foreach ($v in $vessels) {

    $name = Get-Field $v 'shipname'
    if (-not $name) { continue }

    $baseSlug = Get-Slug $name
    $slug = $baseSlug
    if ($slugCount[$baseSlug] -gt 1) {
        $id   = Get-Field $v 'shipID'
        $slug = "$baseSlug-$id"
    }

    # Collect operator for organisations (first occurrence wins)
    $operatorName = Get-Field $v 'Operator_Name'
    if ($operatorName) {
        $orgSlug = Get-Slug $operatorName
        if (-not $orgSet.Contains($orgSlug)) {
            $orgEmail = Get-Field $v 'Email'
            if (-not $orgEmail) { $orgEmail = Get-Field $v 'contact_email' }
            $orgSet[$orgSlug] = [ordered]@{
                name  = $operatorName
                add1  = Get-Field $v 'Operator_Add1'
                add2  = Get-Field $v 'Operator_Add2'
                add3  = Get-Field $v 'Operator_Add3'
                phone = Get-Field $v 'Phone'
                fax   = Get-Field $v 'Fax'
                email = $orgEmail
                url   = Get-Field $v 'url_operator'
            }
        }
    }

    $ownerName  = Get-Field $v 'Owner'
    $ownerSlug  = if ($ownerName)    { Get-Slug $ownerName }    else { '' }
    $operSlug   = if ($operatorName) { Get-Slug $operatorName } else { '' }

    $opEmail = Get-Field $v 'Email'
    if (-not $opEmail) { $opEmail = Get-Field $v 'contact_email' }

    $y = [System.Text.StringBuilder]::new()
    $y.AppendLine("# _data/vessels/$slug.yml") | Out-Null

    Add-Section $y 'IDENTITY'
    Add-Field $y 'name'       $name
    $y.AppendLine("slug: $slug") | Out-Null
    Add-Field $y 'imo_number' $null
    Add-Field $y 'nodc_code'  (Get-Field $v 'NODC_Code')
    Add-Field $y 'call_sign'  (Get-Field $v 'Call_sign')
    Add-Field $y 'year_built' (Get-Field $v 'Year_Built')

    Add-Section $y 'STATUS AND CLASSIFICATION'
    $y.AppendLine("status: $(Convert-Status (Get-Field $v 'oos'))") | Out-Null
    $y.AppendLine("vessel_use_type: Dedicated Research") | Out-Null
    Add-Field $y 'vessel_class'          $null
    Add-Field $y 'main_activity'         (Get-Field $v 'Main_Activity')
    Add-Field $y 'ice_class'             $null
    Add-Field $y 'ice_breaking'          (Get-Field $v 'Ice_breaking')
    Add-Field $y 'dp_class'              $null
    Add-Field $y 'dp_system'             (Get-Field $v 'DPos')
    Add-Field $y 'ism_certified'         (Get-Field $v 'ISM_Cert')
    Add-Field $y 'vessel_classification' (Get-Field $v 'Vessel_class')
    Add-Field $y 'vessel_construction'   (Get-Field $v 'Vessel_construct')
    $y.AppendLine("charter_available: false") | Out-Null

    Add-Section $y 'FLAG AND HOME PORT'
    Add-Field $y 'flag_country'     (Get-Field $v 'country')
    Add-Field $y 'homeport'         (Get-Field $v 'homeport')
    Add-Field $y 'homeport_country' $null

    Add-Section $y 'OWNERSHIP AND OPERATION'
    $y.AppendLine("owner: $ownerSlug") | Out-Null
    $y.AppendLine("operator: $operSlug") | Out-Null
    Add-Field $y 'managing_agency'   (Get-Field $v 'Affiliation')
    Add-Field $y 'operator_contact'  (Get-Field $v 'Contact')
    Add-Field $y 'operator_phone'    (Get-Field $v 'Phone')
    Add-Field $y 'operator_fax'      (Get-Field $v 'Fax')
    Add-Field $y 'operator_email'    $opEmail

    Add-Section $y 'PHYSICAL DIMENSIONS'
    Add-Field $y 'length_m'         (Get-Field $v 'Length')
    Add-Field $y 'beam_m'           (Get-Field $v 'Beam')
    Add-Field $y 'draft_m'          (Get-Field $v 'Draft')
    Add-Field $y 'gross_tons'       (Get-Field $v 'Gross_Tons')
    Add-Field $y 'hull_material'    (Get-Field $v 'Hull_Material')
    Add-Field $y 'freeboard_deck_m' (Get-Field $v 'Freeboard_deck')

    Add-Section $y 'PROPULSION AND PERFORMANCE'
    Add-Field $y 'engine_count'        (Get-Field $v 'Engine_number')
    Add-Field $y 'engine_make'         (Get-Field $v 'Engine_make')
    Add-Field $y 'engine_power'        (Get-Field $v 'Engine_power')
    Add-Field $y 'power_hp'            (Get-Field $v 'Power_HP')
    Add-Field $y 'aux_diesel_power_hp' (Get-Field $v 'Aux_Diesel_pwr')
    Add-Field $y 'prop_diameter_m'     (Get-Field $v 'Prop_diam')
    Add-Field $y 'prop_max_rpm'        (Get-Field $v 'Prop_maxrpm')
    Add-Field $y 'speed_cruise_kts'    (Get-Field $v 'Speed_Cruise')
    Add-Field $y 'speed_max_kts'       (Get-Field $v 'Speed_Max')
    Add-Field $y 'range_nm'            (Get-Field $v 'Range')
    Add-Field $y 'endurance_days'      (Get-Field $v 'Endurance')

    Add-Section $y 'CAPACITY'
    Add-Field $y 'crew'                    (Get-Field $v 'Crew')
    Add-Field $y 'officers'                (Get-Field $v 'Officers')
    Add-Field $y 'scientists'              (Get-Field $v 'Scientists')
    $y.AppendLine("air_conditioning: $(Convert-AirCond (Get-Field $v 'Air_Cond'))") | Out-Null
    Add-Field $y 'fuel_capacity_mt'        (Get-Field $v 'Capacity_fuel')
    Add-Field $y 'capacity_dry_stores_mt'  (Get-Field $v 'Capacity_dry')
    Add-Field $y 'water_capacity_mt'       (Get-Field $v 'Water_capacity')
    Add-Field $y 'water_generation_mt_day' (Get-Field $v 'Water_gen')
    Add-Field $y 'water_treatment'         (Get-Field $v 'Water_clean')

    Add-Section $y 'LABORATORY AND DECK FACILITIES'
    Add-Field $y 'lab_wet_area_m2'     (Get-Field $v 'Area_wetlab')
    Add-Field $y 'lab_dry_area_m2'     (Get-Field $v 'Area_drylab')
    Add-Field $y 'free_deck_area_m2'   (Get-Field $v 'Free_deck_area')
    Add-Field $y 'container_lab_space' (Get-Field $v 'Space_cont_lab')
    Add-Field $y 'radioactive_lab'     (Get-Field $v 'Radioactive')
    Add-Field $y 'diving_support'      (Get-Field $v 'Diving_cap')

    Add-Section $y 'SCIENTIFIC EQUIPMENT'
    Add-Field $y 'multibeam'          (Get-Field $v 'Aquis_Multibeam')
    Add-Field $y 'adcp'               (Get-Field $v 'Aquis_ADCP')
    Add-Field $y 'sidescan_sonar'     (Get-Field $v 'Aquis_sidescan')
    Add-Field $y 'sub_bottom_profiler'(Get-Field $v 'Aquis_SMS')
    Add-Field $y 'echo_sounder'       (Get-Field $v 'Acoustic_echosound')
    Add-Field $y 'acoustic_sonar'     (Get-Field $v 'Acoustic_sonar')
    Add-Field $y 'acoustic_quiet'     (Get-Field $v 'Acoustic_silent')
    $y.AppendLine("") | Out-Null
    $y.AppendLine("ctd:") | Out-Null
    Add-Field $y 'capable'         (Get-Field $v 'CTD_cap')      2
    Add-Field $y 'make'            (Get-Field $v 'CTD_make')     2
    Add-Field $y 'fluorometer'     (Get-Field $v 'CTD_fluor')    2
    Add-Field $y 'oxygen_sensor'   (Get-Field $v 'CTD_oxy')      2
    Add-Field $y 'rosette'         (Get-Field $v 'CTD_rosette')  2
    Add-Field $y 'towed'           (Get-Field $v 'CTD_towed')    2
    Add-Field $y 'transmissometer' (Get-Field $v 'CTD_trans')    2
    $y.AppendLine("") | Out-Null
    $y.AppendLine("coring:") | Out-Null
    Add-Field $y 'capable'       (Get-Field $v 'Core_capable') 2
    Add-Field $y 'box_core'      (Get-Field $v 'Core_box')     2
    Add-Field $y 'grab_sampler'  (Get-Field $v 'Core_grab')    2
    Add-Field $y 'gravity_core'  (Get-Field $v 'Core_gravity') 2
    Add-Field $y 'multi_core'    (Get-Field $v 'Core_multi')   2
    Add-Field $y 'piston_core'   (Get-Field $v 'Core_piston')  2
    $y.AppendLine("") | Out-Null
    Add-Field $y 'underwater_vehicles' (Get-Field $v 'Underwater_vehicles')
    Add-Field $y 'rov_support'         (Get-Field $v 'Underwater_vehicles_rov')
    Add-Field $y 'auv_support'         (Get-Field $v 'Underwater_vehicles_auv')
    Add-Field $y 'submarine_support'   (Get-Field $v 'Underwater_vehicles_sub')

    Add-Section $y 'DECK EQUIPMENT'
    $y.AppendLine("winches:") | Out-Null
    Add-Field $y 'count'                    (Get-Field $v 'OC_winches')       2
    Add-Field $y 'steel_wire_length_m'      (Get-Field $v 'OC_steelwire_len') 2
    Add-Field $y 'steel_wire_load_mt'       (Get-Field $v 'OC_steelwire_load')2
    Add-Field $y 'conducting_cable_length_m'(Get-Field $v 'OC_condcable_len') 2
    Add-Field $y 'conducting_cable_load_mt' (Get-Field $v 'OC_condcable_load')2
    Add-Field $y 'trawl_length_m'           (Get-Field $v 'OC_trawl_len')     2
    Add-Field $y 'trawl_load_mt'            (Get-Field $v 'OC_trawl_load')    2
    Add-Field $y 'other_length_m'           (Get-Field $v 'OC_Other_len')     2
    Add-Field $y 'other_load_mt'            (Get-Field $v 'OC_Other_load')    2
    Add-Field $y 'notes'                    (Get-Field $v 'Winch_other')       2
    $y.AppendLine("") | Out-Null
    $y.AppendLine("gantry:") | Out-Null
    Add-Field $y 'position'            (Get-Field $v 'Gantry_pos')           2
    Add-Field $y 'height_above_deck_m' (Get-Field $v 'Gantry_abovedeck')     2
    Add-Field $y 'outboard_extension_m'(Get-Field $v 'Gantry_outboard_ext')  2
    Add-Field $y 'load_capacity_mt'    (Get-Field $v 'Gantry_load')          2
    $y.AppendLine("") | Out-Null
    $y.AppendLine("cranes:") | Out-Null
    Add-Field $y 'position'            (Get-Field $v 'Crane_pos')            2
    Add-Field $y 'height_above_deck_m' (Get-Field $v 'Crane_abovedeck')      2
    Add-Field $y 'outboard_extension_m'(Get-Field $v 'Crane_outboard_ext')   2
    Add-Field $y 'load_capacity_mt'    (Get-Field $v 'Crane_load')           2

    Add-Section $y 'NAVIGATION AND COMMUNICATIONS'
    Add-Field $y 'navigation_equipment' (Get-Field $v 'Nav_Equipment')
    Add-Field $y 'navigation_gps'       (Get-Field $v 'Nav_GPS')
    Add-Field $y 'communications'       (Get-Field $v 'Nav_Communications')
    Add-Field $y 'satcomm'              (Get-Field $v 'Nav_Satcomm')

    Add-Section $y 'ELECTRICAL SYSTEMS'
    Add-Field $y 'ac_voltage'            (Get-Field $v 'AC_Voltage')
    Add-Field $y 'ac_power_kva'          (Get-Field $v 'AC_Voltage_kVA')
    Add-Field $y 'ac_phases'             (Get-Field $v 'AC_Voltage_phases')
    Add-Field $y 'ac_frequency_hz'       (Get-Field $v 'AC_Voltage_freq')
    Add-Field $y 'ac_voltage_stabilized' (Get-Field $v 'AC_Voltage_Stabilized')
    Add-Field $y 'ac_freq_stabilized_hz' (Get-Field $v 'AC_Freq_Stabilized')
    Add-Field $y 'ac_amps_stabilized'    (Get-Field $v 'AC_Amps_Stabilized')
    Add-Field $y 'dc_voltages'           (Get-Field $v 'DC_Voltages')
    Add-Field $y 'dc_voltage_max'        (Get-Field $v 'DC_Voltage_max')

    Add-Section $y 'DATA SYSTEMS'
    Add-Field $y 'computing_equipment' (Get-Field $v 'DP_Equip')
    Add-Field $y 'data_printing'       (Get-Field $v 'DP_Equip_printing')

    Add-Section $y 'OPERATING PROFILE'
    Add-Field $y 'operating_area_notes' (Get-Field $v 'Operating_area')
    Add-Field $y 'operating_grids'      (Get-Field $v 'Operating_grids')
    $y.AppendLine("operating_regions:         # TODO: populate from operating_area_notes") | Out-Null
    $y.AppendLine("mission_capabilities:      # TODO: populate based on equipment fields") | Out-Null

    Add-Section $y 'PROGRAM MEMBERSHIPS'
    $y.AppendLine("programs:") | Out-Null
    $y.AppendLine("  unols: $(Convert-Bool (Get-Field $v 'Unols'))")   | Out-Null
    $y.AppendLine("  go_ship: $(Convert-Bool (Get-Field $v 'GOShip'))") | Out-Null
    $y.AppendLine("  samos: $(Convert-Bool (Get-Field $v 'SAMOS'))")   | Out-Null
    $y.AppendLine("  vos: $(Convert-Bool (Get-Field $v 'VOS'))")       | Out-Null
    $y.AppendLine("  iwgfi: $(Convert-Bool (Get-Field $v 'IWGFI'))")   | Out-Null
    $y.AppendLine("  euro: $(Convert-Bool (Get-Field $v 'Euro'))")     | Out-Null
    $y.AppendLine("  bonus: $(Convert-Bool (Get-Field $v 'Bonus'))")   | Out-Null

    Add-Section $y 'LINKS'
    Add-Field $y 'url_vessel'   (Get-Field $v 'url_ship')
    Add-Field $y 'url_operator' (Get-Field $v 'url_operator')
    Add-Field $y 'url_schedule' (Get-Field $v 'url_schedule')
    Add-Field $y 'photo_url'    $null

    Add-Section $y 'ADMINISTRATIVE'
    $y.AppendLine("record_updated: $(Convert-Date (Get-Field $v 'updated'))") | Out-Null
    Add-Field $y 'notes'        (Get-Field $v 'Notes')
    Add-Field $y 'vessel_other' (Get-Field $v 'Vessel_other')

    $outPath = Join-Path $outputVessels "$slug.yml"
    [System.IO.File]::WriteAllText($outPath, $y.ToString(), [System.Text.Encoding]::UTF8)
    $count++
}

Write-Host "Wrote $count vessel files to: $outputVessels"

# ---- Write organisation files ------------------------------------------------

$orgCount = 0

foreach ($orgSlug in $orgSet.Keys) {
    $org = $orgSet[$orgSlug]

    $y = [System.Text.StringBuilder]::new()
    $y.AppendLine("# _data/organizations/$orgSlug.yml") | Out-Null
    $y.AppendLine("") | Out-Null
    $y.AppendLine("name: $(Format-Yaml $org.name)") | Out-Null
    $y.AppendLine("slug: $orgSlug") | Out-Null
    $y.AppendLine("abbreviation:") | Out-Null
    $y.AppendLine("organization_type:   # Academic | Government | Military | NGO | Foundation | Commercial") | Out-Null
    $y.AppendLine("parent_organization:") | Out-Null
    $y.AppendLine("country:") | Out-Null
    $y.AppendLine("address: |") | Out-Null
    if ($org.add1) { $y.AppendLine("  $($org.add1)") | Out-Null }
    if ($org.add2) { $y.AppendLine("  $($org.add2)") | Out-Null }
    if ($org.add3) { $y.AppendLine("  $($org.add3)") | Out-Null }
    $y.AppendLine("primary_contact:") | Out-Null
    $y.AppendLine("phone: $(Format-Yaml $org.phone)") | Out-Null
    $y.AppendLine("fax: $(Format-Yaml $org.fax)") | Out-Null
    $y.AppendLine("email: $(Format-Yaml $org.email)") | Out-Null
    $y.AppendLine("url: $(Format-Yaml $org.url)") | Out-Null
    $y.AppendLine("url_fleet:") | Out-Null
    $y.AppendLine("record_updated:") | Out-Null
    $y.AppendLine("notes:") | Out-Null

    $outPath = Join-Path $outputOrgs "$orgSlug.yml"
    [System.IO.File]::WriteAllText($outPath, $y.ToString(), [System.Text.Encoding]::UTF8)
    $orgCount++
}

Write-Host "Wrote $orgCount organization files to: $outputOrgs"
Write-Host ""
Write-Host "Migration complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Review a handful of vessel files in _data/vessels/ to check output quality"
Write-Host "  2. Fill in organization_type and country in _data/organizations/"
Write-Host "  3. Populate operating_regions and mission_capabilities on vessels (marked TODO)"
Write-Host "  4. Add IMO numbers where known"
Write-Host "  5. Review vessels where flag_country may differ from homeport_country"
