import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Button, Accordion } from '@trussworks/react-uswds';
import type { ZodSchema } from 'zod';
import type { FormContract, Role, Page, PermissionsPolicy } from './types';

/** Resolve a dot-path like 'name.firstName' from a nested object. */
function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}
import { ComponentMapper } from './ComponentMapper';
import { FieldArrayRenderer } from './FieldArrayRenderer';
import { resolveCondition } from './ConditionResolver';
import { resolvePermission } from './PermissionsResolver';
import { PageStepper } from './PageStepper';

interface FormRendererProps {
  contract: FormContract;
  schema: ZodSchema;
  role?: Role;
  initialPage?: number;
  defaultValues?: Record<string, unknown>;
  permissionsPolicy?: PermissionsPolicy;
  onSubmit?: (data: Record<string, unknown>) => void;
  onPageChange?: (pageId: string) => void;
}

export function FormRenderer({
  contract,
  schema,
  role = 'applicant',
  initialPage = 0,
  defaultValues,
  permissionsPolicy,
  onSubmit,
  onPageChange,
}: FormRendererProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const { pages, layout = 'wizard' } = contract.form;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues,
  });

  // Reset form when defaultValues change (e.g. test data edited in Storybook)
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const formValues = watch();

  const handleFormSubmit = handleSubmit((data) => {
    onSubmit?.(data);
  });

  const renderFields = (page: Page) => (
    <div className="grid-row grid-gap">
      {page.fields.map((field) => {
        if (!resolveCondition(field.show_when, formValues)) {
          return null;
        }

        const permission = resolvePermission(field, role, permissionsPolicy);
        if (permission === 'hidden') return null;

        if (field.component === 'field-array') {
          return (
            <div key={field.ref} className="grid-col-12">
              <FieldArrayRenderer
                field={field}
                control={control}
                register={register}
                errors={errors}
                formValues={formValues}
                role={role}
                permissionsPolicy={permissionsPolicy}
              />
            </div>
          );
        }

        const widthClass =
          field.width === 'half'
            ? 'grid-col-6'
            : field.width === 'third'
              ? 'grid-col-4'
              : field.width === 'two-thirds'
                ? 'grid-col-8'
                : 'grid-col-12';

        return (
          <div key={field.ref} className={widthClass}>
            <ComponentMapper
              field={field}
              register={register}
              errors={errors}
              permission={permission}
              value={get(formValues, field.ref)}
            />
          </div>
        );
      })}
    </div>
  );

  if (layout === 'review') {
    const accordionItems = pages.map((page) => ({
      id: page.id,
      title: page.title,
      expanded: page.expanded !== false,
      headingLevel: 'h2' as const,
      content: renderFields(page),
    }));

    return (
      <div className="grid-container">
        <h1>{contract.form.title}</h1>
        <Form onSubmit={handleFormSubmit} large>
          <Accordion bordered multiselectable items={accordionItems} />
          <Button type="submit" style={{ marginTop: '1.5rem' }}>
            Save
          </Button>
        </Form>
      </div>
    );
  }

  // Wizard layout (default)
  const page = pages[currentPage];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      const next = currentPage + 1;
      setCurrentPage(next);
      onPageChange?.(pages[next].id);
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      onPageChange?.(pages[prev].id);
    }
  };

  return (
    <div className="grid-container">
      <h1>{contract.form.title}</h1>

      <PageStepper
        pages={pages}
        currentPage={currentPage}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={() => void handleFormSubmit()}
      />

      <Form onSubmit={handleFormSubmit} large>
        <h2>{page.title}</h2>
        {renderFields(page)}
      </Form>
    </div>
  );
}
