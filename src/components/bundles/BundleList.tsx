'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Pencil } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import AssignBundleModal from './AssignBundleModal'
import type { BadgeVariant } from '@/components/ui/Badge'

interface SOPCategory {
  id: string
  name: string
  color: string
}

interface BundleWithCategories {
  id: string
  name: string
  description: string | null
  bundle_sops: {
    sop_id: string
    sops: {
      category_id: string | null
      sop_categories: SOPCategory | null
    } | null
  }[] | null
}

interface Employee {
  id: string
  full_name: string | null
  email: string
}

interface BundleListProps {
  bundles: BundleWithCategories[]
  employees: Employee[]
  categories: SOPCategory[]
  currentUserId: string
  canEdit: boolean
}

export default function BundleList({
  bundles,
  employees,
  categories,
  currentUserId,
  canEdit,
}: BundleListProps) {
  const [assigningBundle, setAssigningBundle] = useState<{
    id: string
    name: string
    sopIds: string[]
  } | null>(null)

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Filter bundles by selected category
  const filteredBundles = selectedCategoryId
    ? bundles.filter((bundle) => {
        const bundleSops = bundle.bundle_sops ?? []
        return bundleSops.some(
          (bs) => bs.sops?.sop_categories?.id === selectedCategoryId
        )
      })
    : bundles

  return (
    <>
      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategoryId(
                  selectedCategoryId === cat.id ? null : cat.id
                )
              }
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filteredBundles.map((bundle) => {
          // Safely normalize bundle_sops
          const bundleSops = bundle.bundle_sops ?? []
          const sopCount = bundleSops.length

          // Derive unique categories from the bundle's SOPs
          const bundleCategories = bundleSops
            .map((bs) => bs.sops?.sop_categories)
            .filter((cat): cat is SOPCategory => cat != null)
            .filter(
              (cat, i, arr) => arr.findIndex((c) => c.id === cat.id) === i
            )

          return (
            <div
              key={bundle.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>

                {canEdit && (
                  <Link
                    href={`/bundles/${bundle.id}`}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {bundle.name}
              </h3>

              {bundle.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                  {bundle.description}
                </p>
              )}

              {/* Category badges */}
              {bundleCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {bundleCategories.map((cat) => (
                    <Badge key={cat.id} variant={cat.color as BadgeVariant}>
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <Badge variant="blue">
                  {sopCount} SOP{sopCount !== 1 ? 's' : ''}
                </Badge>

                {canEdit && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setAssigningBundle({
                        id: bundle.id,
                        name: bundle.name,
                        sopIds: bundleSops.map((bs) => bs.sop_id),
                      })
                    }
                  >
                    <Package className="w-3.5 h-3.5" />
                    Assign
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredBundles.length === 0 && selectedCategoryId && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No bundles found for this category.
        </p>
      )}

      {assigningBundle && (
        <AssignBundleModal
          bundle={assigningBundle}
          employees={employees}
          currentUserId={currentUserId}
          onClose={() => setAssigningBundle(null)}
        />
      )}
    </>
  )
}
