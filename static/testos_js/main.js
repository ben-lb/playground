const url = "http://localhost:3000/machines";
let firstTime = true;
let expandOnLoad = true;
let username = "";
let hidden_rows_ids = [];

setInterval(function() { set_data(); }, 3000); // refresh table evert 3 seconds


const colModel = [
    { label: 'Name', name: 'name', key: true, width: 130 },
    { label: 'Type', name: 'type', width: 100 },
    { label: 'VMs', name: 'vms', hidden: true },
    { label: 'State', name: 'state', width: 100 },
    { label: 'Used by', name: 'used_by', width: 100 },
    { label: 'Labels', name: 'labels', width: 350 },
    { label: 'Uptime', name: 'uptime', width: 150 },
    { label: 'Allocation ID', name: 'allocation_id', width: 250 },
];


let colModelVM = [];
for(let i = 0; i < colModel.length; i++)
{
    if(colModel[i]['name'] === 'labels') {
        continue;
    }
    colModelVM.push(colModel[i]);
}



$(document).ready(function () {
    $("#jqGrid").jqGrid({
        mtype: "GET",
        url: set_data(),
        datatype: 'local',
        styleUI : 'bootstrap',
        colModel: colModel,
        sortname: "name",
        viewrecords: true,
        height: 'auto',
        width: 1500,
        rowNum: 10000,
        cmTemplate: {editable: true},
        sortable: true,
        forceClientSorting: true,
        subGrid: true,
        subGridRowExpanded: showChildGrid,
        subGridOptions : {
            hasSubgrid: function (options) {
                return options.data.vms.length > 0;
            },

            // expand all rows on load
            expandOnLoad: expandOnLoad,
        },
        gridview: false,
        afterInsertRow: function(rowid, aData, rowelem) {
            let rowData = $('#jqGrid').getLocalRow(rowid);

            // If this is a regular row (doesn't have a subgrid)
            if(rowData['vms'].length === 0){
                $('tr#'+rowid, $('#jqGrid')).children("td.sgcollapsed").html("").removeClass('ui-sgcollapsed sgcollapsed');
                $("#"+rowid).find("td").css("background-color", "Lavender");
            }
            else { // A row with a subgrid
                $("#"+rowid).find("td").css("background-color", "lightGrey");
            }
        },
        loadComplete: function () {
            if(firstTime) {
                firstTime = false;
                expandOnLoad = false;
            }
            refresh_search();
            handle_context_menu();
        },
        ondblClickRow: function (rowid) {
            $(this).jqGrid("toggleSubGridRow", rowid);
        }
    });

});

function handle_context_menu() {
    $(".jqgrow", "#jqGrid").contextMenu('machineContextMenu', {
        bindings: {
            'ssh': function(trigger) {
                // trigger is the DOM element ("tr.jqgrow") which are triggered
                var data = {'hostname': trigger.id};
                $.ajax({
                    url: "http://localhost:3000/ssh",
                    type: "POST",
                    dataType: "json",
                    data: JSON.stringify(data),
                    contentType: "application/json; charset=utf-8",
                    error: function (xhr, ajaxOptions, thrownError) {
                        // alert(xhr.responseText);
                        alert(thrownError);
                    }
                });
            },
            'serial': function(trigger) {
                // trigger is the DOM element ("tr.jqgrow") which are triggered
                var data = {'hostname': trigger.id};
                $.ajax({
                    url: "http://localhost:3000/serial",
                    type: "POST",
                    dataType: "json",
                    data: JSON.stringify(data),
                    contentType: "application/json; charset=utf-8",
                    error: function (xhr, ajaxOptions, thrownError) {
                        // alert(xhr.responseText);
                        alert(thrownError);
                    }
                });
            },
        },
        onContextMenu: function(event/*, menu*/) {
            // var rowId = $(event.target).closest("tr.jqgrow").attr("id");
            // // disable menu for rows with even rowids
            // $('#ssh').attr("disabled",Number(rowId)%2 === 0);
            return true;
        }
    });
}


function refresh_search() {
    $('#globalSearchText').empty();
    set_all_used_by();
    $('#globalSearchText').trigger("chosen:updated");
}


$(function () {
    $('input[type="checkbox"]').bootstrapToggle();
    $('input').addClass("ui-widget ui-widget-content ui-corner-all");
});


$( function() {
    $(".chosen-select").chosen();
    $( "#tabs" ).tabs();
    $('.nav-tabs > li > a').click(function(event){
        event.preventDefault();//stop browser to take action for clicked anchor

        //get displaying tab content jQuery selector
        var active_tab_selector = $('.nav-tabs > li.active > a').attr('href');

        //find actived navigation and remove 'active' css
        var actived_nav = $('.nav-tabs > li.active');
        actived_nav.removeClass('active');

        //add 'active' css into clicked navigation
        $(this).parents('li').addClass('active');

        //hide displaying tab content
        $(active_tab_selector).removeClass('active');
        $(active_tab_selector).addClass('hide');

        //show target tab content
        var target_tab_selector = $(this).attr('href');
        $(target_tab_selector).removeClass('hide');
        $(target_tab_selector).addClass('active');
    });
} );


function clear_search() {
    $("#globalSearchText").val('').trigger('chosen:updated');
    username = "";
    hidden_rows_ids = [];
    $("#jqGrid").parents("div.ui-jqgrid-view").children("div.ui-jqgrid-hdiv").show();
    $('#jqGrid').trigger('reloadGrid', [{current:true}]);
}

$( function() {
    $('#clearSearch').click( function (event) {
        clear_search();
    });

    $('#runTestButton').click( function (event) {
        var data = {
            Pylint: $('#pylint').prop('checked'),
            Debug: $('#debug').prop('checked'),
            TestFilePath: $('#testFilePath').val(),
            RootfsType: $('#rootfsType').val(),
            RootfsLabel: $('#rootfsLabel').val(),
        };
        $.ajax({
            type: "POST",
            datatype: 'json',
            url: "http://localhost:3000/run_test",
            data: JSON.stringify(data),
            success: function (data) {
                alert(data);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                // alert(xhr.responseText);
                alert(thrownError);
            }
        })
    });

    $('#globalSearchText').on('change', function() {
        username = this.value;
        filter_by_user();
    });
} );

// the event handler on expanding parent row receives two parameters
// the ID of the grid tow  and the primary key of the row
function showChildGrid(parentRowID, parentRowKey) {
    let childGridID = parentRowID + "_table";
    let childGridPagerID = parentRowID + "_pager";

    // add a table and pager HTML elements to the parent grid row - we will render the child grid here
    $('#' + parentRowID).append('<table id=' + childGridID + '></table>' +
        '<div id=' + childGridPagerID + ' class=scroll></div>');
    let grid_id = "#" + childGridID;
    $(grid_id).jqGrid({
        data: get_vms_data_by_parent_row_id(parentRowKey),
        mtype: "GET",
        datatype: "local",
        colModel: colModelVM,
        sortable: true,
        sortname: 'name',
        width: 1400,
        height: '100%',
        afterInsertRow: function(rowid, aData, rowelem) {
            $("#"+rowid).find("td").css("background-color", "lightBlue");
        },
    });
    $('#jqGrid').jqGrid("hideCol", "subgrid");

}


function get_vms_data_by_parent_row_id(row_id) {
    let rowData = $('#jqGrid').getLocalRow(row_id);
    let rows = [];
    for(let i = 0; i < rowData['vms'].length; i++)
    {
        let vm = rowData['vms'][i];
        add_machine(rows, vm);
    }
    return rows;
}

function set_data() {
    $.ajax({
        type: "GET",
        datatype: 'json',
        url: url,
        success: function (data) {
            let organized_data = organize_machines_data(data);
            var grid = $('#jqGrid').jqGrid("getGridParam");
            grid.data = organized_data;
            $('#jqGrid').trigger('reloadGrid', [{current:true}]);
            $('#globalSearchText').val(username).trigger("chosen:updated");
        }
    });
}

function organize_machines_data(data) {
    let rows = [];
    for(let i = 0; i < data.length; i++)
    {
        let rack = data[i];
        for(let j = 0; j < rack['machines'].length; j++)
        {
            let machine = rack['machines'][j];
            add_machine(rows, machine);
        }
    }
    return rows;
}

function containsObject(obj, list) {
    for (let i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
        }
    }
    return false;
}

function add_machine(rows, machine) {
    if(containsObject(machine['id'], hidden_rows_ids))
    {
        // If this row contains vms array and at least one of them should be visible,
        // then this row should be visible as well
        let hide = true;
        for(let i = 0; machine['vms'] !== undefined && i < machine['vms'].length; i++) {
            let vm_name = machine['vms'][i]['id'];
            if(!containsObject(vm_name, hidden_rows_ids)) {
                hide = false;
                break;
            }
        }
        if(hide) { return; } // hide this row
    }

    let user_name = null;
    let from_time = null;
    if(machine['allocation'] !== null) {
        if(machine.hasOwnProperty('user_name')) { user_name = machine['user_name']; }
        from_time = machine['last_inauguration_date'];
    }
    let data = {
        'name': machine['id'],
        'type': machine['type'],
        'state': machine['state'],
        'used_by': user_name,
        'labels': machine['host_label'],
        'uptime': calculate_uptime(from_time),
        'allocation_id': machine['allocation'],
        'vms': machine['vms']};
    rows.push(data);
}

function calculate_uptime(from_time) {
    if(from_time === null) { return null; }
    let now = new Date();
    let before = new Date(from_time);
    let time_delta_in_seconds = (now - before) / 1000;
    if(time_delta_in_seconds < 60) { return "a few seconds"; }
    if(time_delta_in_seconds < 60*10) { return "a few minutes"; }
    let time_delta_in_minutes = time_delta_in_seconds / 60;
    if(time_delta_in_minutes < 60) { return "less than 1 hour"; }
    let time_delta_in_hours = time_delta_in_minutes / 60;
    if(time_delta_in_hours < 48) { return parseInt(time_delta_in_hours) + " hours"; }
    let time_delta_in_days = time_delta_in_hours / 24;
    return parseInt(time_delta_in_days) + " days";
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function set_all_used_by() {
    let mydata = $("#jqGrid").jqGrid("getGridParam", "data");
    if(mydata.length === 0) { return; }
    let names = [];
    for(let i = 0; i < mydata.length; i++) {
        if(mydata[i]['vms'].length > 0) {
            for(let j = 0; j < mydata[i]['vms'].length; j++) {
                let vm = mydata[i]['vms'][j];
                if(vm['user_name'] === undefined || mydata[i]['user_name'] === null) {
                    continue;
                }
                names.push(vm['user_name']);
            }
        }
        if(mydata[i]['used_by'] === undefined || mydata[i]['used_by'] === null) {
            continue;
        }
        names.push(mydata[i]['used_by']);
    }

    let filtered_names = names.filter(onlyUnique);
    filtered_names.sort(function(a,b){return a.localeCompare(b); });
    // Add none option
    $('#globalSearchText').append($('<option>', { value: "", text : "" }));
    $.each(filtered_names, function (i, item) {
        $('#globalSearchText').append($('<option>', { value: item, text : item }));
    });
}

function filter_by_user() {
    let mydata = $("#jqGrid").jqGrid("getGridParam", "data");
    if(mydata === null) { return; }
    let hideCountMainGrid = 0;
    hidden_rows_ids = [];
    for(let i = 0; i < mydata.length; i++) {
        let vms = mydata[i]['vms'];
        let hideCountSubGrid = 0;
        let subGridId = '#jqGrid_' + mydata[i].name;
        for(let j = 0; j < vms.length   ; j++) {
            let vm = mydata[i]['vms'][j];
            // hide/show subgrid rows
            if(vm['user_name'] === undefined || vm['user_name'] !== username) {
                $('#' + vm.id).hide();
                hideCountSubGrid++;
                hidden_rows_ids.push(vm.id);
            }
            else {
                $('#' + vm.id).show();
            }
        }
        // hide/show column row for subgrid if needed
        if(vms.length === hideCountSubGrid && hideCountSubGrid > 0) {
            $(subGridId).closest("tr.ui-widget-content").hide()
        }
        else if (vms.length > 0) {
            $(subGridId).closest("tr.ui-widget-content").show()
        }

        // hide/show main grid rows
        if(mydata[i]['used_by'] === undefined || mydata[i]['used_by'] !== username) {
            $('#' + mydata[i].name).hide();
            hideCountMainGrid++;
            hidden_rows_ids.push(mydata[i].name);
        }
        else {
            $('#' + mydata[i].name).show();
        }
        if(hideCountMainGrid === mydata.length) {
            $("#jqGrid").parents("div.ui-jqgrid-view").children("div.ui-jqgrid-hdiv").hide();
        }
        else {
            $("#jqGrid").parents("div.ui-jqgrid-view").children("div.ui-jqgrid-hdiv").show();
        }
    }
}