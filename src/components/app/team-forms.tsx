"use client";

import { ActionForm, Submit } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/fields";
import { addInstructor, addVehicle, updateSchool } from "@/app/app/actions";
import { Field } from "@/components/ui/fields";
import { displayPhone } from "@/lib/phone";

export function InstructorForm() {
  return (
    <ActionForm action={addInstructor} resetOnSuccess className="space-y-4">
      <Field label="Nom du moniteur">
        <Input name="full_name" placeholder="Ex. Modou Diouf" required autoFocus />
      </Field>
      <Field label="Téléphone" hint="Facultatif">
        <Input name="phone" type="tel" placeholder="77 123 45 67" />
      </Field>
      <Submit className="w-full">Ajouter le moniteur</Submit>
    </ActionForm>
  );
}

export function VehicleForm() {
  return (
    <ActionForm action={addVehicle} resetOnSuccess className="grid grid-cols-2 gap-4">
      <Field label="Nom de la voiture" className="col-span-2">
        <Input name="label" placeholder="Ex. Clio blanche" required autoFocus />
      </Field>
      <Field label="Immatriculation">
        <Input name="plate" placeholder="DK-1234-AB" />
      </Field>
      <Field label="Catégorie">
        <Select name="category" defaultValue="B">
          <option value="B">B · Voiture</option>
          <option value="A">A · Moto</option>
          <option value="C">C · Poids lourd</option>
          <option value="D">D · Bus</option>
          <option value="E">E · Remorque</option>
        </Select>
      </Field>
      <Submit className="col-span-2">Ajouter la voiture</Submit>
    </ActionForm>
  );
}

export function SchoolForm({ school }: { school: { name: string; city: string | null; phone: string | null; address: string | null } }) {
  return (
    <ActionForm action={updateSchool} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom de l'auto-école" className="sm:col-span-2">
        <Input name="name" defaultValue={school.name} required />
      </Field>
      <Field label="Ville">
        <Input name="city" defaultValue={school.city ?? ""} />
      </Field>
      <Field label="Téléphone">
        <Input name="phone" type="tel" defaultValue={school.phone ? displayPhone(school.phone) : ""} />
      </Field>
      <Field label="Adresse" className="sm:col-span-2">
        <Input name="address" defaultValue={school.address ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <Submit className="w-full sm:w-auto">Enregistrer</Submit>
      </div>
    </ActionForm>
  );
}
