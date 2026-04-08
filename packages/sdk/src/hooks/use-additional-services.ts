/**
 * Additional Services Hooks
 *
 * Fetches and mutates additional services (tilleggstjenester).
 */

import { useQuery, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

export interface AdditionalService {
    id: string;
    name: string;
    label: string; // Alias for name (for component compatibility)
    description: string;
    price: number;
    currency: string;
    isRequired: boolean;
    displayOrder: number;
}

/**
 * Hook to fetch additional services for a resource
 */
export function useAdditionalServices(resourceId: string | undefined) {
    const services = useQuery(
        api.domain.additionalServices.listByResource,
        resourceId ? { resourceId: resourceId as Id<"resources"> } : "skip"
    );

    // Transform to component-friendly format
    const transformed: AdditionalService[] = (services ?? []).map((service) => ({
        id: service._id,
        name: service.name,
        label: service.name, // Alias for compatibility with BookingPricingStep
        description: service.description ?? "",
        price: service.price,
        currency: service.currency ?? "NOK",
        isRequired: service.isRequired ?? false,
        displayOrder: service.displayOrder ?? 999,
    }));

    return {
        services: transformed,
        isLoading: services === undefined,
    };
}

/**
 * Hook to fetch all additional services for a tenant
 */
export function useAdditionalServicesByTenant(tenantId: string | undefined, options?: { isActive?: boolean }) {
    const services = useQuery(
        api.domain.additionalServices.listByTenant,
        tenantId ? { tenantId: tenantId as Id<"tenants">, isActive: options?.isActive } : "skip"
    );

    const transformed: AdditionalService[] = (services ?? []).map((service: any) => ({
        id: service._id,
        name: service.name,
        label: service.name,
        description: service.description ?? "",
        price: service.price,
        currency: service.currency ?? "NOK",
        isRequired: service.isRequired ?? false,
        displayOrder: service.displayOrder ?? 999,
    }));

    return {
        services: transformed,
        isLoading: services === undefined,
    };
}

/**
 * Hook to fetch additional services for display in OverviewTab
 * Returns in the format expected by OverviewTab
 */
export function useAdditionalServicesForDisplay(resourceId: string | undefined) {
    const { services, isLoading } = useAdditionalServices(resourceId);

    // Transform to OverviewTab format
    const displayServices = services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        currency: service.currency,
    }));

    return {
        services: displayServices,
        isLoading,
    };
}

// ── Mutation Hooks ──

export interface CreateAdditionalServiceArgs {
    tenantId: string;
    resourceId: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    isRequired?: boolean;
    displayOrder?: number;
}

export function useCreateAdditionalService() {
    const mutationFn = useMutation(api.domain.additionalServices.create);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (args: CreateAdditionalServiceArgs) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await mutationFn({
                tenantId: args.tenantId as Id<"tenants">,
                resourceId: args.resourceId,
                name: args.name,
                description: args.description,
                price: args.price,
                currency: args.currency,
                isRequired: args.isRequired,
                displayOrder: args.displayOrder,
            });
            return result;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [mutationFn]);

    return { mutate, isLoading, error };
}

export interface UpdateAdditionalServiceArgs {
    serviceId: string;
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    isRequired?: boolean;
    displayOrder?: number;
    isActive?: boolean;
}

export function useUpdateAdditionalService() {
    const mutationFn = useMutation(api.domain.additionalServices.update);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (args: UpdateAdditionalServiceArgs) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await mutationFn({
                serviceId: args.serviceId,
                name: args.name,
                description: args.description,
                price: args.price,
                currency: args.currency,
                isRequired: args.isRequired,
                displayOrder: args.displayOrder,
                isActive: args.isActive,
            });
            return result;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [mutationFn]);

    return { mutate, isLoading, error };
}

export function useDeleteAdditionalService() {
    const mutationFn = useMutation(api.domain.additionalServices.remove);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (serviceId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await mutationFn({ serviceId });
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [mutationFn]);

    return { mutate, isLoading, error };
}
