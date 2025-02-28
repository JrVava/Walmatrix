import GroupingAttributes from './ItemGroupAttrInterface';
export default interface WallmartItemsVariant extends GroupingAttributes {
    variantGroupInfo: {
        isPrimary: boolean;
        // groupingAttributes: Array<GroupingAttributes>
    };
}
