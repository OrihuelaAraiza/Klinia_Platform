import { useEffect, useMemo, useState } from "react";
import Button from "./UI/Button.jsx";
import InputField from "./InputField.jsx";
import Field from "./UI/Field.jsx";
import { listPatients } from "../services/patientsService.js";
import { useToast } from "./UI/Toast.jsx";
import { SESSION_MODALITY, SESSION_MODALITY_LABEL } from "../utils/constants.js";
import { isValidEmail, isValidPhone } from "../utils/validators.js";

const DEFAULT_FORM = {
    patientMode: "registered",
    patientId: "",
    unregisteredFirstName: "",
    unregisteredLastName: "",
    unregisteredPhone: "",
    unregisteredEmail: "",
    datetime: "",
    durationMin: 50,
    professionalId: "",
    professionalName: "",
    status: "SCHEDULED",
    modality: SESSION_MODALITY.IN_PERSON,
    location: "",
    callLink: "",
    notes: "",
};

function nowLocalInputValue() {
    const now = new Date();
    now.setSeconds(0, 0);
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
}

function toLocalInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
}

function fromLocalInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString();
}

export default function SessionForm({
    initialValue,
    onSubmit,
    onCancel,
    onStartRegistration,
    readOnly = false,
    defaultProfessional,
    defaultProfessionalId,
    presetPatientId,
}) {
    const toast = useToast();
    const professionalId = defaultProfessionalId;

    const [form, setForm] = useState(() => ({
        ...DEFAULT_FORM,
        ...(initialValue || {}),
        datetime: toLocalInput(initialValue?.datetime),
        professionalId:
            initialValue?.professionalId || defaultProfessionalId || "",
        professionalName:
            initialValue?.professionalName || defaultProfessional || "",
        patientId: presetPatientId || initialValue?.patientId || "",
        patientMode:
            presetPatientId ||
            initialValue?.patientId
                ? "registered"
                : (initialValue?.patientMode || "registered"),
        unregisteredFirstName:
            initialValue?.unregisteredFirstName || "",
        unregisteredLastName:
            initialValue?.unregisteredLastName || "",
        unregisteredPhone:
            initialValue?.unregisteredPhone || "",
        unregisteredEmail:
            initialValue?.unregisteredEmail || "",
        modality:
            initialValue?.modality || SESSION_MODALITY.IN_PERSON,
        location: initialValue?.location || "",
        callLink: initialValue?.callLink || "",
    }));

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [patients, setPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadPatients() {
            if (readOnly || !professionalId) return;

            setLoadingPatients(true);
            try {
                const response = await listPatients({
                    size: 100,
                    professionalId,
                });

                if (!active) return;

                const items = Array.isArray(response?.items)
                    ? response.items
                    : response;

                setPatients(items || []);
            } catch (error) {
                if (!active) return;
                toast.error(
                    error?.message ||
                        "No pudimos obtener la lista de pacientes asignados."
                );
            } finally {
                if (active) setLoadingPatients(false);
            }
        }

        if (professionalId) loadPatients();

        return () => {
            active = false;
        };
    }, [readOnly, toast, professionalId]);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            ...(initialValue || {}),
            datetime: toLocalInput(initialValue?.datetime),
            patientMode:
                presetPatientId ||
                initialValue?.patientId
                    ? "registered"
                    : (initialValue?.patientMode || "registered"),
            unregisteredFirstName:
                initialValue?.unregisteredFirstName || "",
            unregisteredLastName:
                initialValue?.unregisteredLastName || "",
            unregisteredPhone:
                initialValue?.unregisteredPhone || "",
            unregisteredEmail:
                initialValue?.unregisteredEmail || "",
            modality:
                initialValue?.modality ||
                SESSION_MODALITY.IN_PERSON,
            location: initialValue?.location || "",
            callLink: initialValue?.callLink || "",
        }));
    }, [initialValue, presetPatientId]);

    const patientOptions = useMemo(() => {
        return patients.map((patient) => ({
            value: patient.id,
            label:
                `${patient.firstName || ""} ${
                    patient.lastName || ""
                }`.trim() ||
                patient.curp ||
                patient.id,
        }));
    }, [patients]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => {
            if (name === "patientMode") {
                return {
                    ...prev,
                    patientMode: value,
                    ...(value === "registered"
                        ? {
                              unregisteredFirstName: "",
                              unregisteredLastName: "",
                              unregisteredPhone: "",
                              unregisteredEmail: "",
                          }
                        : { patientId: "" }),
                };
            }
            return { ...prev, [name]: value };
        });
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validate = () => {
        const nextErrors = {};
        const isUnregisteredMode =
            !presetPatientId && form.patientMode === "unregistered";

        if (!presetPatientId && !isUnregisteredMode && !form.patientId) {
            nextErrors.patientId = "Selecciona un paciente.";
        }
        if (isUnregisteredMode) {
            if (!form.unregisteredFirstName?.trim()) {
                nextErrors.unregisteredFirstName = "Ingresa el nombre.";
            }
            if (!form.unregisteredLastName?.trim()) {
                nextErrors.unregisteredLastName = "Ingresa el apellido.";
            }
            if (!form.unregisteredPhone?.trim()) {
                nextErrors.unregisteredPhone = "Ingresa un teléfono de contacto.";
            } else if (!isValidPhone(form.unregisteredPhone.trim())) {
                nextErrors.unregisteredPhone = "Ingresa un teléfono válido.";
            }
            if (form.unregisteredEmail?.trim() && !isValidEmail(form.unregisteredEmail.trim())) {
                nextErrors.unregisteredEmail = "Ingresa un correo válido.";
            }
        }

        if (!form.datetime) {
            nextErrors.datetime = "Define fecha y hora.";
        } else {
            const selectedDate = new Date(form.datetime);
            if (Number.isNaN(selectedDate.getTime())) {
                nextErrors.datetime = "Fecha inválida.";
            } else if (selectedDate.getTime() <= Date.now()) {
                nextErrors.datetime = "Elige una fecha futura.";
            }
        }

        const durationValue = Number(form.durationMin);
        if (!durationValue) {
            nextErrors.durationMin =
                "Ingresa la duración en minutos.";
        } else if (durationValue < 15 || durationValue > 180) {
            nextErrors.durationMin =
                "La duración debe estar entre 15 y 180 minutos.";
        }

        if (!form.professionalId && !form.professionalName) {
            nextErrors.professionalName =
                "Ingresa el profesional responsable.";
        }

        if (!form.modality) {
            nextErrors.modality = "Selecciona la modalidad.";
        }

        if (
            form.modality === SESSION_MODALITY.TELEMEDICINE
        ) {
            if (!form.callLink) {
                nextErrors.callLink =
                    "Ingresa el link de la videollamada.";
            } else {
                try {
                    const urlStr = form.callLink.startsWith(
                        "http"
                    )
                        ? form.callLink
                        : `https://${form.callLink}`;
                    const url = new URL(urlStr);
                    if (
                        !["http:", "https:"].includes(
                            url.protocol
                        )
                    ) {
                        nextErrors.callLink =
                            "El link debe comenzar con http(s).";
                    }
                } catch {
                    nextErrors.callLink =
                        "Ingresa una URL válida.";
                }
            }
        }

        return nextErrors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (readOnly) return;

        const validation = validate();
        setErrors(validation);

        if (Object.keys(validation).length) return;

        setSubmitting(true);

        try {
            const payload = {
                patientId:
                    presetPatientId || form.patientId,
                patientMode:
                    presetPatientId
                        ? "registered"
                        : (form.patientMode || "registered"),
                unregisteredPatient:
                    !presetPatientId &&
                    form.patientMode === "unregistered"
                        ? {
                              firstName: form.unregisteredFirstName?.trim(),
                              lastName: form.unregisteredLastName?.trim(),
                              phone: form.unregisteredPhone?.trim(),
                              email: form.unregisteredEmail?.trim(),
                          }
                        : undefined,
                datetime: fromLocalInput(form.datetime),
                durationMinutes:
                    Number(form.durationMin) || 60,
                status: "SCHEDULED",
                professionalId:
                    form.professionalId ||
                    defaultProfessionalId ||
                    "",
                modality:
                    form.modality ||
                    SESSION_MODALITY.IN_PERSON,
                location:
                    form.location?.trim() || undefined,
                callLink:
                    form.modality ===
                    SESSION_MODALITY.TELEMEDICINE
                        ? form.callLink?.trim() ||
                          undefined
                        : undefined,
                notes:
                    form.notes?.trim() || undefined,
            };

            await onSubmit?.(payload);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            className="stack-3"
            onSubmit={handleSubmit}
            noValidate
        >
            {!presetPatientId && (
                <Field label="Tipo de agendamiento">
                    {({ fieldId }) => (
                        <select
                            id={fieldId}
                            name="patientMode"
                            className="role-select"
                            value={form.patientMode}
                            onChange={handleChange}
                            disabled={readOnly}
                        >
                            <option value="registered">Paciente registrado</option>
                            <option value="unregistered">Paciente no registrado</option>
                        </select>
                    )}
                </Field>
            )}

            {!presetPatientId && (
                <>
                    {form.patientMode !== "unregistered" ? (
                        <Field
                            label="Paciente"
                            required
                            error={errors.patientId}
                        >
                            {({ fieldId }) => (
                                <select
                                    id={fieldId}
                                    name="patientId"
                                    className={`role-select${
                                        errors.patientId
                                            ? " has-error"
                                            : ""
                                    }`}
                                    value={form.patientId}
                                    onChange={handleChange}
                                    disabled={
                                        readOnly ||
                                        loadingPatients ||
                                        patients.length === 0
                                    }
                                    aria-invalid={Boolean(
                                        errors.patientId
                                    )}
                                >
                                    <option value="">
                                        {loadingPatients
                                            ? "Cargando pacientes asignados..."
                                            : "Selecciona..."}
                                    </option>
                                    {patientOptions.map(
                                        (option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            )}
                        </Field>
                    ) : (
                        <div className="panel panel--outline stack-3">
                            <p className="helper-text" style={{ margin: 0 }}>
                                Agenda una sesión con pre-registro y completa el expediente después.
                            </p>
                            <div className="grid-2">
                                <InputField
                                    label="Nombre(s)"
                                    name="unregisteredFirstName"
                                    value={form.unregisteredFirstName}
                                    onChange={handleChange}
                                    required
                                    error={errors.unregisteredFirstName}
                                    disabled={readOnly}
                                />
                                <InputField
                                    label="Apellido(s)"
                                    name="unregisteredLastName"
                                    value={form.unregisteredLastName}
                                    onChange={handleChange}
                                    required
                                    error={errors.unregisteredLastName}
                                    disabled={readOnly}
                                />
                                <InputField
                                    label="Teléfono"
                                    name="unregisteredPhone"
                                    value={form.unregisteredPhone}
                                    onChange={handleChange}
                                    required
                                    error={errors.unregisteredPhone}
                                    disabled={readOnly}
                                />
                                <InputField
                                    label="Correo (opcional)"
                                    type="email"
                                    name="unregisteredEmail"
                                    value={form.unregisteredEmail}
                                    onChange={handleChange}
                                    error={errors.unregisteredEmail}
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="cluster">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                        onStartRegistration?.({
                                            firstName: form.unregisteredFirstName?.trim(),
                                            lastName: form.unregisteredLastName?.trim(),
                                            phone: form.unregisteredPhone?.trim(),
                                            email: form.unregisteredEmail?.trim(),
                                        })
                                    }
                                    disabled={readOnly}
                                >
                                    Iniciar registro completo
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <InputField
                label="Fecha y hora"
                type="datetime-local"
                name="datetime"
                value={form.datetime}
                onChange={handleChange}
                required
                error={errors.datetime}
                disabled={readOnly}
                min={nowLocalInputValue()}
            />

            <InputField
                label="Duración (min)"
                type="number"
                name="durationMin"
                value={form.durationMin}
                onChange={handleChange}
                required
                error={errors.durationMin}
                disabled={readOnly}
                min={15}
                max={180}
            />

            <Field
                label="Modalidad"
                required
                error={errors.modality}
            >
                {({ fieldId }) => (
                    <select
                        id={fieldId}
                        name="modality"
                        className={`role-select${
                            errors.modality
                                ? " has-error"
                                : ""
                        }`}
                        value={form.modality}
                        onChange={handleChange}
                        disabled={readOnly}
                        aria-invalid={Boolean(
                            errors.modality
                        )}
                    >
                        {Object.entries(
                            SESSION_MODALITY
                        ).map(([key, value]) => (
                            <option
                                key={key}
                                value={value}
                            >
                                {
                                    SESSION_MODALITY_LABEL[
                                        value
                                    ]
                                }
                            </option>
                        ))}
                    </select>
                )}
            </Field>

            {form.modality ===
                SESSION_MODALITY.TELEMEDICINE && (
                <InputField
                    label="Link de videollamada"
                    type="url"
                    name="callLink"
                    value={form.callLink}
                    onChange={handleChange}
                    error={errors.callLink}
                    disabled={readOnly}
                    required
                    placeholder="https://meet.google.com/..."
                    assistiveText="Enlace para la sesión virtual (Zoom, Meet, WhatsApp, etc)."
                />
            )}

            <InputField
                label="Ubicación (opcional)"
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                error={errors.location}
                disabled={readOnly}
                placeholder="Consultorio 4B"
                assistiveText="Lugar físico de la sesión."
            />

            <InputField
                label="Profesional"
                name="professionalName"
                value={form.professionalName}
                onChange={handleChange}
                error={errors.professionalName}
                disabled
                assistiveText="Nombre que aparecerá en la nota y registro."
            />

            <input
                type="hidden"
                name="professionalId"
                value={form.professionalId}
            />

            <InputField
                label="Notas internas"
                type="text"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Recordatorios o consideraciones para la sesión"
                assistiveText="Opcional. Información relevante para la sesión (no clínica)."
            />

            {!readOnly && (
                <div className="form__actions">
                    {onCancel && (
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={onCancel}
                            disabled={submitting}
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        type="submit"
                        loading={submitting}
                    >
                        Guardar sesión
                    </Button>
                </div>
            )}
        </form>
    );
}
