"use client";

import { ActionForm, Submit } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/fields";
import { addInstructor, addVehicle, updateSchool } from "@/app/app/actions";
import { Field } from "@/components/ui/fields";

export function InstructorForm() {
  return (
    <ActionForm action={addInstructor} resetOnSuccess className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <Input name="full_name" placeholder="Nom du moniteur" required aria-label="Nom du moniteur" />
      <Input name="phone" type="tel" placeholder="Téléphone" aria-label="Téléphone" />
      <Submit>Ajouter</Submit>
    </ActionForm>
  );
}

export function VehicleForm() {
  return (
    <ActionForm action={addVehicle} resetOnSuccess className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
      <Input name="label" placeholder="Ex. Clio blanche" required aria-label="Nom de la voiture" />
      <Input name="plate" placeholder="Immatriculation" aria-label="Immatriculation" />
      <Select name="category" defaultValue="B" aria-label="Catégorie">
        <option value="B">B</option>
        <option value="A">A</option>
        <option value="C">C</option>
        <option value="D">D</option>
        <option value="E">E</option>
      </Select>
      <Submit>Ajouter</Submit>
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
        <Input name="phone" type="tel" defaultValue={school.phone ?? ""} />
      </Field>
      <Field label="Adresse" className="sm:col-span-2">
        <Input name="address" defaultValue={school.address ?? ""} />
      </Field>
      <div>
        <Submit>Enregistrer</Submit>
      </div>
    </ActionForm>
  );
}
